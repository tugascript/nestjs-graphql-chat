import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'mercurius';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchDto } from '../common/dtos/search.dto';
import { SlugDto } from '../common/dtos/slug.dto';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { ChatsService } from './chats.service';
import { ChatDto } from './dtos/chat.dto';
import { InvitationDto } from './dtos/invitation.dto';
import { ChatEntity } from './entities/chat.entity';
import { ChatNotificationType } from './entities/gql/chat-notification.type';
import { PaginatedChatsType } from './entities/gql/paginated-chats.type';
import { CreateChatInput } from './inputs/create-chat.input';
import { IChatNotification } from './interfaces/chat-notification.interface';

@Resolver(() => ChatEntity)
export class ChatsResolver {
  constructor(private readonly chatsService: ChatsService) {}

  @Mutation(() => ChatEntity)
  public createChat(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args('input') input: CreateChatInput,
  ): Promise<ChatEntity> {
    return this.chatsService.createChat(pubsub, userId, input);
  }

  @Query(() => PaginatedChatsType, { name: 'publicChats' })
  public filterPublicChats(
    @Args() dto: SearchDto,
  ): Promise<IPaginated<ChatEntity>> {
    return this.chatsService.filterPublicChats(dto);
  }

  @Query(() => ChatEntity)
  public async chatById(
    @CurrentUser() userId: string,
    @Args() dto: ChatDto,
  ): Promise<ChatEntity> {
    return this.chatsService.chatById(userId, dto.chatId);
  }

  @Query(() => ChatEntity)
  public async chatBySlug(
    @CurrentUser() userId: string,
    @Args() dto: SlugDto,
  ): Promise<ChatEntity> {
    return this.chatsService.chatBySlug(userId, dto.slug);
  }

  @Query(() => ChatEntity)
  public async chatByInvitation(
    @Args() dto: InvitationDto,
  ): Promise<ChatEntity> {
    return this.chatsService.chatByInvitation(dto.invitation);
  }

  @Mutation(() => LocalMessageType)
  public async removeChat(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args() dto: ChatDto,
  ): Promise<LocalMessageType> {
    return this.chatsService.removeChat(pubsub, userId, dto.chatId);
  }

  @Subscription(() => ChatNotificationType)
  public async chatNotification(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args() dto: ChatDto,
  ) {
    return pubsub.subscribe<IChatNotification>(
      `CHAT_${dto.chatId.toUpperCase()}`,
    );
  }
}
