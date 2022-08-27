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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SearchDto } from '../../common/dtos/search.dto';
import { SlugDto } from '../../common/dtos/slug.dto';
import { LocalMessageType } from '../../common/entities/gql/message.type';
import { contextToUser } from '../../common/helpers/context-to-user';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { ICtx } from '../../config/interfaces/ctx.interface';
import { ChatMessageRedisEntity } from '../../messages/entities/chat-message.redis-entity';
import { PaginatedMessagesType } from '../../messages/entities/gql/paginated-messages.type';
import { MessagesService } from '../../messages/messages.service';
import { PUB_SUB } from '../../pubsub/pubsub.module';
import { UserEntity } from '../../users/entities/user.entity';
import { UserRedisEntity } from '../../users/entities/user.redis-entity';
import { UsersService } from '../../users/users.service';
import { ChatsService } from '../chats.service';
import { ChatDto } from '../dtos/chat.dto';
import { FilterChatMessagesDto } from '../dtos/filter-chat-messages.dto';
import { FilterChatProfilesDto } from '../dtos/filter-chat-profiles.dto';
import { InvitationDto } from '../dtos/invitation.dto';
import { ChatRedisEntity } from '../entities/chat.redis-entity';
import { ChatChangeType } from '../entities/gql/chat-change.type';
import { PaginatedChatsType } from '../entities/gql/paginated-chats.type';
import { PaginatedProfilesType } from '../entities/gql/paginated-profiles.type';
import { ProfileRedisEntity } from '../entities/profile.redis-entity';
import { CreateChatInput } from '../inputs/create-chat.input';
import { UpdateChatInput } from '../inputs/update-chat.input';
import { IChatChange } from '../interfaces/chat-change.interface';

@Resolver(() => ChatRedisEntity)
export class ChatsResolver {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
    private readonly messagesService: MessagesService,
    @Inject(PUB_SUB)
    private readonly pubsub: RedisPubSub,
  ) {}

  @Mutation(() => ChatRedisEntity)
  public createChat(
    @CurrentUser() userId: string,
    @Args('input') input: CreateChatInput,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.createChat(userId, input);
  }

  @Query(() => PaginatedChatsType, { name: 'publicChats' })
  public filterPublicChats(
    @Args() dto: SearchDto,
  ): Promise<IPaginated<ChatRedisEntity>> {
    return this.chatsService.filterPublicChats(dto);
  }

  @Query(() => ChatRedisEntity)
  public async chatById(
    @CurrentUser() userId: string,
    @Args() dto: ChatDto,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.chatById(userId, dto.chatId);
  }

  @Query(() => ChatRedisEntity)
  public async chatBySlug(
    @CurrentUser() userId: string,
    @Args() dto: SlugDto,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.chatBySlug(userId, dto.slug);
  }

  @Query(() => ChatRedisEntity)
  public async chatByInvitation(
    @Args() dto: InvitationDto,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.chatByInvitation(dto.invitation);
  }

  @Query(() => [ChatRedisEntity])
  public async userChats(
    @CurrentUser() userId: string,
  ): Promise<ChatRedisEntity[]> {
    return this.chatsService.userChats(userId);
  }

  @Query(() => [ChatRedisEntity])
  public async memberChats(
    @CurrentUser() userId: string,
  ): Promise<ChatRedisEntity[]> {
    return this.chatsService.memberChats(userId);
  }

  @Mutation(() => ChatRedisEntity)
  public async updateChat(
    @CurrentUser() userId: string,
    @Args('input') input: UpdateChatInput,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.updateChat(userId, input);
  }

  @Mutation(() => LocalMessageType)
  public async removeChat(
    @CurrentUser() userId: string,
    @Args() dto: ChatDto,
  ): Promise<LocalMessageType> {
    return this.chatsService.removeChat(userId, dto.chatId);
  }

  @Subscription(() => ChatChangeType, {
    async filter(
      this: ChatsResolver,
      payload: IChatChange,
      args: ChatDto,
      context: ICtx,
    ): Promise<boolean> {
      const user = contextToUser(context);
      return this.chatsService.checkProfileExistence(user, args.chatId);
    },
  })
  public async chatChange(@CurrentUser() userId: string, @Args() dto: ChatDto) {
    return this.pubsub.asyncIterator<IChatChange>(
      `CHAT_${dto.chatId.toUpperCase()}`,
    );
  }

  @ResolveField('profiles', () => PaginatedProfilesType)
  public async resolveProfiles(
    @Parent() chat: ChatRedisEntity,
    @CurrentUser() userId: string,
    @Args() dto: FilterChatProfilesDto,
  ): Promise<IPaginated<ProfileRedisEntity>> {
    return this.chatsService.getPaginatedProfiles(
      chat.entityId,
      dto.first,
      dto.nickname,
    );
  }

  @ResolveField('messages', () => PaginatedMessagesType)
  public async resolveMessages(
    @Parent() chat: ChatRedisEntity,
    @Args() dto: FilterChatMessagesDto,
  ): Promise<IPaginated<ChatMessageRedisEntity>> {
    return this.messagesService.getPaginatedMessages(chat, dto.first);
  }

  @ResolveField('profilesCount', () => Int)
  public async resolveProfilesCount(
    @Parent() chat: ChatRedisEntity,
  ): Promise<number> {
    return this.chatsService.countProfiles(chat.entityId);
  }

  @ResolveField('endOfLife', () => GraphQLTimestamp)
  public resolveEndOfLife(@Parent() chat: ChatRedisEntity): Date {
    return new Date(chat.endOfLife() * 1000);
  }

  @ResolveField('expiration', () => Int)
  public resolveExpiration(@Parent() chat: ChatRedisEntity): number {
    return chat.expiration();
  }

  @ResolveField('author', () => UserEntity)
  public async resolveUser(
    @Parent() chat: ChatRedisEntity,
  ): Promise<UserRedisEntity> {
    return this.usersService.userById(chat.userId);
  }
}
