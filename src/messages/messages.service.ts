import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'redis-om';
import { ChatsService } from '../chats/chats.service';
import { ChatRedisEntity } from '../chats/entities/chat.redis-entity';
import { CommonService } from '../common/common.service';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { AfterCursorEnum } from '../common/enums/after-cursor.enum';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { QueryOrderEnum } from '../common/enums/query-order.enum';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { EncryptionService } from '../encryption/encryption.service';
import { PUB_SUB } from '../pubsub/pubsub.module';
import { RedisClientService } from '../redis-client/redis-client.service';
import { ChatMessageDto } from './dtos/chat-message.dto';
import { FilterMessagesDto } from './dtos/filter-messages.dto';
import {
  ChatMessageRedisEntity,
  chatMessageSchema,
} from './entities/chat-message.redis-entity';
import { CreateMessageInput } from './inputs/create-message.input';
import { UpdateMessageInput } from './inputs/update-message.input';
import { IMessageChange } from './interfaces/message-change.interface';

@Injectable()
export class MessagesService implements OnModuleInit {
  private readonly chatMessagesRepository: Repository<ChatMessageRedisEntity>;

  constructor(
    private readonly redisClient: RedisClientService,
    private readonly commonService: CommonService,
    private readonly encryptionService: EncryptionService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
    @Inject(PUB_SUB)
    private readonly pubsub: RedisPubSub,
  ) {
    this.chatMessagesRepository =
      redisClient.fetchRepository(chatMessageSchema);
  }

  public async onModuleInit() {
    await this.chatMessagesRepository.createIndex();
  }

  public async createMessage(
    userId: string,
    { chatId, body }: CreateMessageInput,
  ): Promise<ChatMessageRedisEntity> {
    const profile = await this.chatsService.checkChatMembership(userId, chatId);
    const chat = await this.chatsService.uncheckedChatById(chatId);
    const expiration = profile.expiration();
    const message = await this.chatMessagesRepository.createEntity({
      chatId,
      userId,
      body: this.encryptionService.encrypt(
        body,
        this.encryptionService.masterDecrypt(chat.chatKey),
      ),
      profileId: profile.entityId,
      time: expiration,
    });
    await this.commonService.saveRedisEntity(
      this.chatMessagesRepository,
      message,
      expiration,
    );
    message.body = body;
    this.publishMessageChange(message, ChangeTypeEnum.NEW);
    return message;
  }

  public async updateMessage(
    userId: string,
    { chatId, messageId, body }: UpdateMessageInput,
  ): Promise<ChatMessageRedisEntity> {
    const profile = await this.chatsService.checkChatMembership(userId, chatId);
    const message = await this.messageByAuthor(profile.entityId, messageId);
    const chat = await this.chatsService.uncheckedChatById(chatId);
    message.body = this.encryptionService.encrypt(
      body,
      this.encryptionService.masterDecrypt(chat.chatKey),
    );
    await this.commonService.saveRedisEntity(
      this.chatMessagesRepository,
      message,
      message.expiration(),
    );
    message.body = body;
    this.publishMessageChange(message, ChangeTypeEnum.UPDATE);
    return message;
  }

  public async removeMessage(
    userId: string,
    { chatId, messageId }: ChatMessageDto,
  ): Promise<LocalMessageType> {
    const profile = await this.chatsService.checkChatMembership(userId, chatId);
    const message = await this.messageByAuthor(profile.entityId, messageId);
    await this.commonService.removeRedisEntity(
      this.chatMessagesRepository,
      message,
    );
    this.publishMessageChange(message, ChangeTypeEnum.DELETE);
    return new LocalMessageType('Message deleted successfully');
  }

  public async messageById(
    userId: string,
    { chatId, messageId }: ChatMessageDto,
  ): Promise<ChatMessageRedisEntity> {
    await this.chatsService.checkChatMembership(userId, chatId);
    const message = await this.chatMessagesRepository.fetch(messageId);
    this.commonService.checkExistence('Message', message);

    if (message.chatId !== chatId)
      throw new NotFoundException('Message not found');

    const chat = await this.chatsService.uncheckedChatById(chatId);
    message.body = this.encryptionService.decrypt(
      message.body,
      this.encryptionService.masterDecrypt(chat.chatKey),
    );
    return message;
  }

  public async filterChatMessages(
    userId: string,
    { chatId, first, after }: FilterMessagesDto,
  ): Promise<IPaginated<ChatMessageRedisEntity>> {
    await this.chatsService.checkChatMembership(userId, chatId);
    const chat = await this.chatsService.uncheckedChatById(chatId);
    return this.getPaginatedMessages(chat, first, after);
  }

  public async getPaginatedMessages(
    chat: ChatRedisEntity,
    first: number,
    after?: string,
  ): Promise<IPaginated<ChatMessageRedisEntity>> {
    const paginatedMessages = await this.commonService.redisPagination(
      'createdAt',
      first,
      QueryOrderEnum.DESC,
      this.chatMessagesRepository,
      (r) => r.search().where('chatId').equals(chat.entityId),
      after,
      AfterCursorEnum.DATE,
    );
    const key = this.encryptionService.masterDecrypt(chat.chatKey);

    for (let i = 0; i < paginatedMessages.edges.length; i++) {
      paginatedMessages.edges[i].node.body = this.encryptionService.decrypt(
        paginatedMessages.edges[i].node.body,
        key,
      );
    }

    return paginatedMessages;
  }

  public async deleteChatMessages(chatId: string): Promise<void> {
    const messages = await this.chatMessagesRepository
      .search()
      .where('chatId')
      .equals(chatId)
      .return.all();

    if (messages.length > 0) {
      for (const message of messages) {
        await this.commonService.removeRedisEntity(
          this.chatMessagesRepository,
          message,
        );
      }
    }
  }

  public async deleteUserMessages(userId: string): Promise<void> {
    const messages = await this.chatMessagesRepository
      .search()
      .where('userId')
      .equals(userId)
      .return.all();

    if (messages.length > 0) {
      for (const message of messages) {
        await this.commonService.removeRedisEntity(
          this.chatMessagesRepository,
          message,
        );
        this.publishMessageChange(message, ChangeTypeEnum.DELETE);
      }
    }
  }

  private async messageByAuthor(
    profileId: string,
    messageId: string,
  ): Promise<ChatMessageRedisEntity> {
    const message = await this.chatMessagesRepository.fetch(messageId);
    this.commonService.checkExistence('Message', message);
    if (message.profileId !== profileId)
      throw new NotFoundException('Message not found');
    return message;
  }

  private async publishMessageChange(
    message: ChatMessageRedisEntity,
    notificationType: ChangeTypeEnum,
  ): Promise<void> {
    await this.pubsub.publish<IMessageChange>(
      `MESSAGES_${message.chatId.toUpperCase()}`,
      {
        messageChange: this.commonService.generateChange(
          message,
          notificationType,
          'createdAt',
        ),
      },
    );
  }
}
