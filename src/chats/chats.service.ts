import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'redis-om';
import { v4 as uuidV4 } from 'uuid';
import { CommonService } from '../common/common.service';
import { SearchDto } from '../common/dtos/search.dto';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { getAfterCursor } from '../common/enums/after-cursor.enum';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { getQueryCursor } from '../common/enums/query-cursor.enum';
import { QueryOrderEnum } from '../common/enums/query-order.enum';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { EncryptionService } from '../encryption/encryption.service';
import { MessagesService } from '../messages/messages.service';
import { PUB_SUB } from '../pubsub/pubsub.module';
import { RedisClientService } from '../redis-client/redis-client.service';
import { UsersService } from '../users/users.service';
import { FilterProfilesDto } from './dtos/filter-profiles.dto';
import { ProfileSlugDto } from './dtos/profile-slug.dto';
import { ProfileDto } from './dtos/profile.dto';
import { ChatRedisEntity, chatSchema } from './entities/chat.redis-entity';
import {
  ProfileRedisEntity,
  profileSchema,
} from './entities/profile.redis-entity';
import { ChatTypeEnum } from './enums/chat-type.enum';
import { CreateChatInput } from './inputs/create-chat.input';
import { UpdateChatInput } from './inputs/update-chat.input';
import { UpdateNicknameInput } from './inputs/update-nickname.input';
import { UpdateProfileNicknameInput } from './inputs/update-profile-nickname.input';
import { IChatChange } from './interfaces/chat-change.interface';
import { IProfileChange } from './interfaces/profile-change.interface';

@Injectable()
export class ChatsService implements OnModuleInit {
  private readonly chatsRepository: Repository<ChatRedisEntity>;
  private readonly profilesRepository: Repository<ProfileRedisEntity>;

  constructor(
    private readonly redisClient: RedisClientService,
    private readonly commonService: CommonService,
    private readonly encryptionService: EncryptionService,
    private readonly usersService: UsersService,
    private readonly messagesService: MessagesService,
    @Inject(PUB_SUB)
    private readonly pubsub: RedisPubSub,
  ) {
    this.chatsRepository = redisClient.fetchRepository(chatSchema);
    this.profilesRepository = redisClient.fetchRepository(profileSchema);
  }

  public async onModuleInit() {
    await this.chatsRepository.createIndex();
    await this.profilesRepository.createIndex();
  }

  public async createChat(
    userId: string,
    { name, chatType, time }: CreateChatInput,
  ): Promise<ChatRedisEntity> {
    name = this.commonService.formatTitle(name);
    let slug = this.commonService.generatePointSlug(name);
    const count = await this.chatsRepository
      .search()
      .where('name')
      .equals(name)
      .return.count();

    if (count > 0) slug += count.toString();

    time = time * 60;
    const chat = this.chatsRepository.createEntity({
      name,
      slug,
      chatType,
      userId,
      time,
      chatKey: await this.encryptionService.generateChatKey(),
      invitation: uuidV4(),
    });
    await this.commonService.saveRedisEntity(this.chatsRepository, chat, time);
    const user = await this.usersService.userById(userId);
    const profile = this.profilesRepository.createEntity({
      userId,
      nickname: user.name,
      slug: this.commonService.generateSlug(user.name),
      chatId: chat.entityId,
      time: time,
    });
    await this.commonService.saveRedisEntity(
      this.profilesRepository,
      profile,
      time,
    );
    this.publishChatChange(chat, ChangeTypeEnum.NEW);
    return chat;
  }

  public async createProfile(
    userId: string,
    invitation: string,
  ): Promise<ProfileRedisEntity> {
    const chat = await this.chatByInvitation(invitation);
    const count = await this.profilesRepository
      .search()
      .where('chatId')
      .equals(chat.entityId)
      .and('userId')
      .equals(userId)
      .return.count();

    if (count > 0) throw new ConflictException('Profile already exists.');

    const time = chat.expiration();
    const user = await this.usersService.userById(userId);
    const profile = this.profilesRepository.createEntity({
      userId,
      time,
      nickname: user.name,
      slug: this.commonService.generateSlug(user.name),
      chatId: chat.entityId,
    });
    await this.commonService.saveRedisEntity(
      this.profilesRepository,
      profile,
      time,
    );
    this.publishProfileChange(profile, ChangeTypeEnum.NEW);
    return profile;
  }

  public async filterPublicChats({
    search,
    first,
    after,
    order,
    cursor,
  }: SearchDto): Promise<IPaginated<ChatRedisEntity>> {
    return this.commonService.redisPagination(
      getQueryCursor(cursor) as keyof ChatRedisEntity,
      first,
      order,
      this.chatsRepository,
      (r) => {
        const qb = r.search().where('chatType').equals(ChatTypeEnum.PUBLIC);

        if (search) {
          qb.and('name').contains(this.commonService.formatRedisSearch(search));
        }

        return qb;
      },
      after,
      getAfterCursor(cursor),
    );
  }

  public async chatById(
    userId: string,
    chatId: string,
  ): Promise<ChatRedisEntity> {
    const chat = await this.chatsRepository.fetch(chatId);
    this.commonService.checkExistence('Chat', chat);
    await this.checkChatType(userId, chat);
    return chat;
  }

  public async chatBySlug(
    userId: string,
    slug: string,
  ): Promise<ChatRedisEntity> {
    const chat = await this.chatsRepository
      .search()
      .where('slug')
      .equals(slug)
      .return.first();
    this.commonService.checkExistence('Chat', chat);
    await this.checkChatType(userId, chat);
    return chat;
  }

  public async chatByInvitation(invitation: string): Promise<ChatRedisEntity> {
    const chat = await this.chatsRepository
      .search()
      .where('invitation')
      .equals(invitation)
      .return.first();
    this.commonService.checkExistence('Chat', chat);
    return chat;
  }

  public async filterProfiles(
    userId: string,
    { chatId, nickname, first, after }: FilterProfilesDto,
  ) {
    const count = await this.profilesRepository
      .search()
      .where('chatId')
      .equals(chatId)
      .and('userId')
      .equals(userId)
      .return.count();

    if (count === 0)
      throw new UnauthorizedException(
        'Chat does not exist or you are not a member.',
      );

    return this.getPaginatedProfiles(chatId, first, nickname, after);
  }

  public async getPaginatedProfiles(
    chatId: string,
    first: number,
    nickname?: string,
    after?: string,
  ): Promise<IPaginated<ProfileRedisEntity>> {
    return this.commonService.redisPagination(
      'slug',
      first,
      QueryOrderEnum.ASC,
      this.profilesRepository,
      (r) => {
        const qb = r.search().where('chatId').equals(chatId);

        if (nickname) {
          qb.and('nickname').contains(
            this.commonService.formatRedisSearch(nickname),
          );
        }

        return qb;
      },
      after,
    );
  }

  public async countProfiles(chatId: string): Promise<number> {
    return this.profilesRepository
      .search()
      .where('chatId')
      .equals(chatId)
      .return.count();
  }

  public async profileById(
    userId: string,
    { chatId, profileId }: ProfileDto,
  ): Promise<ProfileRedisEntity> {
    const userProfile = await this.checkChatMembership(userId, chatId);

    if (userProfile.entityId === profileId) return userProfile;

    const profile = await this.profilesRepository.fetch(profileId);
    this.commonService.checkExistence('Profile', profile);

    if (profile.chatId !== chatId)
      throw new NotFoundException('Profile not found.');

    return profile;
  }

  public async profileBySlug(
    userId: string,
    { chatId, slug }: ProfileSlugDto,
  ): Promise<ProfileRedisEntity> {
    const userProfile = await this.checkChatMembership(userId, chatId);

    if (userProfile.slug === slug) return userProfile;

    const profile = await this.profilesRepository
      .search()
      .where('slug')
      .equals(slug)
      .and('chatId')
      .equals(chatId)
      .return.first();
    this.commonService.checkExistence('Profile', profile);
    return profile;
  }

  public async updateChat(
    userId: string,
    { chatId, chatType, name }: UpdateChatInput,
  ): Promise<ChatRedisEntity> {
    const chat = await this.chatByAuthor(userId, chatId);

    if (name) chat.name = this.commonService.formatTitle(name);
    if (chatType) chat.chatType = chatType;

    await this.commonService.saveRedisEntity(
      this.chatsRepository,
      chat,
      chat.expiration(),
    );
    this.publishChatChange(chat, ChangeTypeEnum.UPDATE);
    return chat;
  }

  public async removeChat(
    userId: string,
    chatId: string,
  ): Promise<LocalMessageType> {
    const chat = await this.chatByAuthor(userId, chatId);
    await this.commonService.removeRedisEntity(this.chatsRepository, chat);
    await this.deleteProfiles(chatId);
    await this.messagesService.deleteChatMessages(chatId);
    this.publishChatChange(chat, ChangeTypeEnum.DELETE);
    return new LocalMessageType('Chat deleted successfully');
  }

  public async updateOwnNickname(
    userId: string,
    { chatId, nickname }: UpdateNicknameInput,
  ): Promise<ProfileRedisEntity> {
    const userProfile = await this.checkChatMembership(userId, chatId);
    nickname = this.commonService.formatTitle(nickname);
    userProfile.nickname = nickname;
    userProfile.slug = this.commonService.generateSlug(nickname);
    await this.commonService.saveRedisEntity(
      this.profilesRepository,
      userProfile,
      userProfile.expiration(),
    );
    this.publishProfileChange(userProfile, ChangeTypeEnum.UPDATE);
    return userProfile;
  }

  public async updateProfileNickname(
    userId: string,
    { chatId, profileId, nickname }: UpdateProfileNicknameInput,
  ): Promise<ProfileRedisEntity> {
    await this.checkChatOwnership(userId, chatId);
    const profile = await this.profilesRepository.fetch(profileId);
    this.commonService.checkExistence('Profile', profile);

    if (profile.chatId !== chatId)
      throw new NotFoundException('Profile not found');

    nickname = this.commonService.formatTitle(nickname);
    profile.nickname = nickname;
    profile.slug = this.commonService.generateSlug(nickname);
    await this.commonService.saveRedisEntity(
      this.profilesRepository,
      profile,
      profile.expiration(),
    );
    this.publishProfileChange(profile, ChangeTypeEnum.UPDATE);
    return profile;
  }

  public async leaveChat(
    userId: string,
    chatId: string,
  ): Promise<LocalMessageType> {
    const profileId = await this.profilesRepository
      .search()
      .where('userId')
      .equals(userId)
      .and('chatId')
      .equals(chatId)
      .return.firstId();

    if (!profileId)
      throw new UnauthorizedException(
        'Chat does not exist or you are not a member.',
      );

    await this.commonService.throwInternalError(
      this.profilesRepository.remove(profileId),
    );
    return new LocalMessageType('Chat left successfully');
  }

  public async removeProfile(
    userId: string,
    { chatId, profileId }: ProfileDto,
  ): Promise<LocalMessageType> {
    await this.checkChatOwnership(userId, chatId);
    const profile = await this.profilesRepository.fetch(profileId);

    if (!profile && profile.chatId !== chatId)
      throw new NotFoundException('Profile not found');
    if (profile.userId === userId)
      throw new BadRequestException('You cannot remove yourself');

    await this.commonService.throwInternalError(
      this.profilesRepository.remove(profileId),
    );
    return new LocalMessageType('Profile deleted successfully');
  }

  public async checkChatMembership(
    userId: string,
    chatId: string,
  ): Promise<ProfileRedisEntity> {
    const userProfile = await this.profilesRepository
      .search()
      .where('userId')
      .equals(userId)
      .and('chatId')
      .equals(chatId)
      .return.first();

    if (!userProfile)
      throw new UnauthorizedException(
        'Chat does not exist or you are not a member.',
      );

    return userProfile;
  }

  public async uncheckedChatById(chatId: string): Promise<ChatRedisEntity> {
    const chat = await this.chatsRepository.fetch(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  public async uncheckedProfileById(
    profileId: string,
  ): Promise<ProfileRedisEntity> {
    const profile = await this.profilesRepository.fetch(profileId);
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  public async checkProfileExistence(
    userId: string,
    chatId: string,
  ): Promise<boolean> {
    const count = await this.profilesRepository
      .search()
      .where('chatId')
      .equals(chatId)
      .and('userId')
      .equals(userId)
      .return.count();

    return count > 0;
  }

  public async memberChats(userId: string): Promise<ChatRedisEntity[]> {
    const profiles = await this.profilesRepository
      .search()
      .where('userId')
      .equals(userId)
      .return.all();

    if (profiles.length === 0) return [];

    const chatIds = profiles.map((profile) => profile.chatId);
    const chats: ChatRedisEntity[] = [];

    for (const chatId of chatIds) {
      const chat = await this.chatsRepository.fetch(chatId);
      if (chat) chats.push(chat);
    }

    return chats;
  }

  public async userChats(userId: string): Promise<ChatRedisEntity[]> {
    return this.chatsRepository
      .search()
      .where('userId')
      .equals(userId)
      .return.all();
  }

  private async deleteProfiles(chatId: string): Promise<void> {
    const profiles = await this.profilesRepository
      .search()
      .where('chatId')
      .equals(chatId)
      .return.all();

    if (profiles.length > 0) {
      for (const profile of profiles) {
        await this.commonService.removeRedisEntity(
          this.profilesRepository,
          profile,
        );
      }
    }
  }

  private async chatByAuthor(
    userId: string,
    chatId: string,
  ): Promise<ChatRedisEntity> {
    const chat = await this.chatsRepository.fetch(chatId);
    this.commonService.checkExistence('Chat', chat);
    if (chat.userId !== userId) throw new NotFoundException('Chat not found.');
    return chat;
  }

  private async checkChatType(
    userId: string,
    chat: ChatRedisEntity,
  ): Promise<void> {
    if (chat.chatType === ChatTypeEnum.PRIVATE && chat.userId !== userId) {
      const count = await this.profilesRepository
        .search()
        .where('userId')
        .equals(userId)
        .return.count();

      if (count === 0) throw new NotFoundException('Chat not found.');
    }
  }

  private async checkChatOwnership(
    userId: string,
    chatId: string,
  ): Promise<ChatRedisEntity> {
    const chat = await this.chatsRepository.fetch(chatId);

    if (!chat || chat.userId !== userId)
      throw new UnauthorizedException(
        'Chat does not exist or you are not the author.',
      );

    return chat;
  }

  private publishChatChange(
    chat: ChatRedisEntity,
    notificationType: ChangeTypeEnum,
  ): void {
    this.pubsub.publish<IChatChange>(`CHAT_${chat.entityId.toUpperCase()}`, {
      chatChange: this.commonService.generateChange(
        chat,
        notificationType,
        'createdAt',
      ),
    });
  }

  private publishProfileChange(
    profile: ProfileRedisEntity,
    notificationType: ChangeTypeEnum,
  ): void {
    this.pubsub.publish<IProfileChange>(
      `PROFILES_${profile.chatId.toUpperCase()}`,
      {
        profileChange: this.commonService.generateChange(
          profile,
          notificationType,
          'slug',
        ),
      },
    );
  }
}
