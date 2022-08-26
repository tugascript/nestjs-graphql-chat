import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { PubSub } from 'mercurius';
import { Repository } from 'redis-om';
import { v4 as uuidV4 } from 'uuid';
import { CommonService } from '../common/common.service';
import { SearchDto } from '../common/dtos/search.dto';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { getAfterCursor } from '../common/enums/after-cursor.enum';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import { getQueryCursor } from '../common/enums/query-cursor.enum';
import { QueryOrderEnum } from '../common/enums/query-order.enum';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { EncryptionService } from '../encryption/encryption.service';
import { RedisClientService } from '../redis-client/redis-client.service';
import { UsersService } from '../users/users.service';
import { FilterProfilesDto } from './dtos/filter-profiles.dto';
import { ProfileSlugDto } from './dtos/profile-slug.dto';
import { ProfileDto } from './dtos/profile.dto';
import { ChatEntity, chatSchema } from './entities/chat.entity';
import { ProfileEntity, profileSchema } from './entities/profiles.entity';
import { ChatTypeEnum } from './enums/chat-type.enum';
import { CreateChatInput } from './inputs/create-chat.input';
import { UpdateChatInput } from './inputs/update-chat.input';
import { UpdateNicknameInput } from './inputs/update-nickname.input';
import { UpdateProfileNicknameInput } from './inputs/update-profile-nickname.input';
import { IChatNotification } from './interfaces/chat-notification.interface';

@Injectable()
export class ChatsService implements OnModuleInit {
  private readonly chatsRepository: Repository<ChatEntity>;
  private readonly profilesRepository: Repository<ProfileEntity>;
  private readonly chatExpiration = 86400;

  constructor(
    private readonly redisClient: RedisClientService,
    private readonly commonService: CommonService,
    private readonly encryptionService: EncryptionService,
    private readonly usersService: UsersService,
  ) {
    this.chatsRepository = redisClient.fetchRepository(chatSchema);
    this.profilesRepository = redisClient.fetchRepository(profileSchema);
  }

  public async onModuleInit() {
    await this.chatsRepository.createIndex();
    await this.profilesRepository.createIndex();
  }

  public async createChat(
    pubsub: PubSub,
    userId: string,
    { name, chatType }: CreateChatInput,
  ): Promise<ChatEntity> {
    name = this.commonService.formatTitle(name);
    let slug = this.commonService.generatePointSlug(name);
    const count = await this.chatsRepository
      .search()
      .where('name')
      .equals(name)
      .return.count();

    if (count > 0) slug += count.toString();

    const chat = this.chatsRepository.createEntity({
      name,
      slug,
      chatType,
      userId,
      chatKey: await this.encryptionService.generateChatKey(),
      invitation: uuidV4(),
    });
    await this.commonService.saveRedisEntity(
      this.chatsRepository,
      chat,
      this.chatExpiration,
    );
    const user = await this.usersService.userById(userId);
    const profile = this.profilesRepository.createEntity({
      userId,
      nickname: user.name,
      slug: this.commonService.generateSlug(user.name),
      chatId: chat.entityId,
      time: this.chatExpiration,
    });
    await this.commonService.saveRedisEntity(
      this.profilesRepository,
      profile,
      this.chatExpiration,
    );
    this.generateChatNotification(pubsub, chat, NotificationTypeEnum.NEW);
    return chat;
  }

  public async createProfile(
    pubsub: PubSub,
    userId: string,
    invitation: string,
  ): Promise<ProfileEntity> {
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
    this.generateChatNotification(pubsub, chat, NotificationTypeEnum.UPDATE);
    return profile;
  }

  public async filterPublicChats({
    search,
    first,
    after,
    order,
    cursor,
  }: SearchDto): Promise<IPaginated<ChatEntity>> {
    return this.commonService.redisPagination(
      getQueryCursor(cursor) as keyof ChatEntity,
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

  public async chatById(userId: string, chatId: string): Promise<ChatEntity> {
    const chat = await this.chatsRepository.fetch(chatId);
    this.commonService.checkExistence('Chat', chat);
    await this.checkChatType(userId, chat);
    return chat;
  }

  public async chatBySlug(userId: string, slug: string): Promise<ChatEntity> {
    const chat = await this.chatsRepository
      .search()
      .where('slug')
      .equals(slug)
      .return.first();
    this.commonService.checkExistence('Chat', chat);
    await this.checkChatType(userId, chat);
    return chat;
  }

  public async chatByInvitation(invitation: string): Promise<ChatEntity> {
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
  ): Promise<ProfileEntity> {
    const userProfile = await this.checkMembership(userId, chatId);

    if (userProfile.entityId === profileId) return userProfile;

    const profile = await this.profilesRepository
      .search()
      .where('entityId')
      .equals(profileId)
      .and('chatId')
      .equals(chatId)
      .return.first();
    this.commonService.checkExistence('Profile', profile);
    return profile;
  }

  public async profileBySlug(
    userId: string,
    { chatId, slug }: ProfileSlugDto,
  ): Promise<ProfileEntity> {
    const userProfile = await this.checkMembership(userId, chatId);

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
    pubsub: PubSub,
    userId: string,
    { chatId, chatType, name }: UpdateChatInput,
  ): Promise<ChatEntity> {
    const chat = await this.chatByAuthor(userId, chatId);

    if (name) chat.name = this.commonService.formatTitle(name);
    if (chatType) chat.chatType = chatType;

    await this.commonService.saveRedisEntity(
      this.chatsRepository,
      chat,
      chat.expiration(),
    );
    this.generateChatNotification(pubsub, chat, NotificationTypeEnum.UPDATE);
    return chat;
  }

  public async removeChat(
    pubsub: PubSub,
    userId: string,
    chatId: string,
  ): Promise<LocalMessageType> {
    const chat = await this.chatByAuthor(userId, chatId);
    await this.commonService.throwInternalError(
      this.chatsRepository.remove(chat.entityId),
    );
    const profileIds = await this.commonService.throwInternalError(
      this.profilesRepository
        .search()
        .where('chatId')
        .equals(chat.entityId)
        .return.allIds(),
    );

    for (const id of profileIds) {
      await this.commonService.throwInternalError(
        this.profilesRepository.remove(id),
      );
    }

    this.generateChatNotification(pubsub, chat, NotificationTypeEnum.DELETE);
    return new LocalMessageType('Chat deleted successfully');
  }

  public async updateOwnNickname(
    pubsub: PubSub,
    userId: string,
    { chatId, nickname }: UpdateNicknameInput,
  ): Promise<ProfileEntity> {
    const userProfile = await this.checkMembership(userId, chatId);
    nickname = this.commonService.formatTitle(nickname);
    userProfile.nickname = nickname;
    userProfile.slug = this.commonService.generateSlug(nickname);
    await this.commonService.saveRedisEntity(
      this.profilesRepository,
      userProfile,
      userProfile.expiration(),
    );
    const chat = await this.chatsRepository.fetch(chatId);

    if (chat)
      this.generateChatNotification(pubsub, chat, NotificationTypeEnum.UPDATE);

    return userProfile;
  }

  public async updateProfileNickname(
    pubsub: PubSub,
    userId: string,
    { chatId, profileId, nickname }: UpdateProfileNicknameInput,
  ): Promise<ProfileEntity> {
    const chat = await this.checkChatOwnership(userId, chatId);
    const profile = await this.profilesRepository
      .search()
      .where('entityId')
      .equals(profileId)
      .and('chatId')
      .equals(chatId)
      .return.first();
    this.commonService.checkExistence('Profile', profile);
    nickname = this.commonService.formatTitle(nickname);
    profile.nickname = nickname;
    profile.slug = this.commonService.generateSlug(nickname);
    await this.commonService.saveRedisEntity(
      this.profilesRepository,
      profile,
      profile.expiration(),
    );
    this.generateChatNotification(pubsub, chat, NotificationTypeEnum.UPDATE);
    return profile;
  }

  public async leaveChat(
    pubsub: PubSub,
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
    pubsub: PubSub,
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

  private async chatByAuthor(
    userId: string,
    chatId: string,
  ): Promise<ChatEntity> {
    const chat = await this.chatsRepository.fetch(chatId);
    this.commonService.checkExistence('Chat', chat);
    if (chat.userId !== userId) throw new NotFoundException('Chat not found.');
    return chat;
  }

  private async checkChatType(userId: string, chat: ChatEntity): Promise<void> {
    if (chat.chatType === ChatTypeEnum.PRIVATE && chat.userId !== userId) {
      const count = await this.profilesRepository
        .search()
        .where('userId')
        .equals(userId)
        .return.count();

      if (count === 0) throw new NotFoundException('Chat not found.');
    }
  }

  private async checkMembership(
    userId: string,
    chatId: string,
  ): Promise<ProfileEntity> {
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

  private async checkChatOwnership(
    userId: string,
    chatId: string,
  ): Promise<ChatEntity> {
    const chat = await this.chatsRepository
      .search()
      .where('entityId')
      .equals(chatId)
      .and('userId')
      .equals(userId)
      .return.first();

    if (!chat)
      throw new UnauthorizedException(
        'Chat does not exist or you are not the author.',
      );

    return chat;
  }

  private generateChatNotification(
    pubsub: PubSub,
    chat: ChatEntity,
    notificationType: NotificationTypeEnum,
  ): void {
    pubsub.publish<IChatNotification>({
      topic: `CHAT_${chat.entityId.toUpperCase()}`,
      payload: {
        chatNotification: this.commonService.generateNotification(
          chat,
          notificationType,
          'createdAt',
        ),
      },
    });
  }
}
