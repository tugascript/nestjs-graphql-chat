import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PubSub } from 'mercurius';
import { Repository } from 'redis-om';
import { v4 as uuidV4 } from 'uuid';
import { CommonService } from '../common/common.service';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { EncryptionService } from '../encryption/encryption.service';
import { RedisClientService } from '../redis-client/redis-client.service';
import { UsersService } from '../users/users.service';
import { ChatEntity, chatSchema } from './entities/chat.entity';
import { ProfileEntity, profileSchema } from './entities/profiles.entity';
import { ChatTypeEnum } from './enums/chat-type.enum';
import { CreateChatInput } from './inputs/create-chat.input';
import { UpdateChatInput } from './inputs/update-chat.input';

@Injectable()
export class ChatsService implements OnModuleInit {
  private readonly chatsRepository: Repository<ChatEntity>;
  private readonly profilesRepository: Repository<ProfileEntity>;

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
    await this.commonService.saveRedisEntity(this.chatsRepository, chat);
    await this.commonService.throwInternalError(
      this.chatsRepository.expire(chat.entityId, 86400),
    );
    return chat;
  }

  public async createProfile(
    pubsub: PubSub,
    userId: string,
    invitation: string,
  ): Promise<ProfileEntity> {
    const chat = await this.chatByInvitation(invitation);
    const profile = this.profilesRepository.createEntity({});
  }

  public async filterPublicChats(): Promise<IPaginated<ChatEntity>> {}

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

  public async updateChat(
    pubsub: PubSub,
    userId: string,
    { chatId, chatType, name }: UpdateChatInput,
  ): Promise<ChatEntity> {
    const chat = await this.chatByAuthor(userId, chatId);

    if (name) chat.name = this.commonService.formatTitle(name);
    if (chatType) chat.chatType = chatType;

    await this.commonService.throwInternalError(
      this.chatsRepository.save(chat),
    );
    await this.commonService.throwInternalError(
      this.chatsRepository.expire(chat.entityId, chat.expiration()),
    );
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

    return new LocalMessageType('Chat deleted successfully');
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
}
