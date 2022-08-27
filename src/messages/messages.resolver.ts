import { Inject } from '@nestjs/common';
import {
  Args,
  GraphQLTimestamp,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatsService } from '../chats/chats.service';
import { ChatDto } from '../chats/dtos/chat.dto';
import { ChatRedisEntity } from '../chats/entities/chat.redis-entity';
import { ProfileRedisEntity } from '../chats/entities/profile.redis-entity';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { contextToUser } from '../common/helpers/context-to-user';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { ICtx } from '../config/interfaces/ctx.interface';
import { PUB_SUB } from '../pubsub/pubsub.module';
import { ChatMessageDto } from './dtos/chat-message.dto';
import { FilterMessagesDto } from './dtos/filter-messages.dto';
import { ChatMessageRedisEntity } from './entities/chat-message.redis-entity';
import { MessageChangeType } from './entities/gql/message-change.type';
import { PaginatedMessagesType } from './entities/gql/paginated-messages.type';
import { CreateMessageInput } from './inputs/create-message.input';
import { UpdateMessageInput } from './inputs/update-message.input';
import { IMessageChange } from './interfaces/message-change.interface';
import { MessagesService } from './messages.service';

@Resolver(() => ChatMessageRedisEntity)
export class MessagesResolver {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
    @Inject(PUB_SUB)
    private readonly pubsub: RedisPubSub,
  ) {}

  @Mutation(() => ChatMessageRedisEntity)
  public async createMessage(
    @CurrentUser() userId: string,
    @Args('input') input: CreateMessageInput,
  ): Promise<ChatMessageRedisEntity> {
    return this.messagesService.createMessage(userId, input);
  }

  @Mutation(() => ChatMessageRedisEntity)
  public async updateMessage(
    @CurrentUser() userId: string,
    @Args('input') input: UpdateMessageInput,
  ): Promise<ChatMessageRedisEntity> {
    return this.messagesService.updateMessage(userId, input);
  }

  @Mutation(() => LocalMessageType)
  public async removeMessage(
    @CurrentUser() userId: string,
    @Args() dto: ChatMessageDto,
  ): Promise<LocalMessageType> {
    return this.messagesService.removeMessage(userId, dto);
  }

  @Query(() => ChatMessageRedisEntity)
  public async messageById(
    @CurrentUser() userId: string,
    @Args() dto: ChatMessageDto,
  ): Promise<ChatMessageRedisEntity> {
    return this.messagesService.messageById(userId, dto);
  }

  @Query(() => PaginatedMessagesType, { name: 'chatMessages' })
  public async filterMessages(
    @CurrentUser() userId: string,
    @Args() dto: FilterMessagesDto,
  ): Promise<IPaginated<ChatMessageRedisEntity>> {
    return this.messagesService.filterChatMessages(userId, dto);
  }

  @Subscription(() => MessageChangeType, {
    async filter(
      this: MessagesResolver,
      payload: IMessageChange,
      variables: ChatDto,
      context: ICtx,
    ) {
      return this.chatsService.checkProfileExistence(
        contextToUser(context),
        variables.chatId,
      );
    },
  })
  public async messageChange(@Args() dto: ChatDto): Promise<any> {
    return this.pubsub.asyncIterator(`MESSAGES_${dto.chatId.toUpperCase()}`);
  }

  @ResolveField('profile', () => ProfileRedisEntity)
  public async resolveProfile(
    @Parent() message: ChatMessageRedisEntity,
  ): Promise<ProfileRedisEntity> {
    return this.chatsService.uncheckedProfileById(message.profileId);
  }

  @ResolveField('chat', () => ChatRedisEntity)
  public async resolveChat(
    @Parent() message: ChatMessageRedisEntity,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.uncheckedChatById(message.chatId);
  }

  @ResolveField('endOfLife', () => GraphQLTimestamp)
  public resolveEndOfLife(@Parent() message: ChatMessageRedisEntity): Date {
    return new Date(message.endOfLife() * 1000);
  }

  @ResolveField('expiration', () => Int)
  public resolveExpiration(@Parent() message: ChatMessageRedisEntity): number {
    return message.expiration();
  }
}
