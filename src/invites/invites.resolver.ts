import { Inject } from '@nestjs/common';
import {
  Args,
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
import { InvitationDto } from '../chats/dtos/invitation.dto';
import { ChatRedisEntity } from '../chats/entities/chat.redis-entity';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { PUB_SUB } from '../pubsub/pubsub.module';
import { UserEntity } from '../users/entities/user.entity';
import { UserRedisEntity } from '../users/entities/user.redis-entity';
import { UsersService } from '../users/users.service';
import { FilterInvitesDto } from './dtos/filter-invites.dto';
import { InviteDto } from './dtos/invite.dto';
import { InviteChangeType } from './entities/gql/invite-change.type';
import { PaginatedInvitesType } from './entities/gql/paginated-invites.type';
import { InviteRedisEntity } from './entities/invite.redis-entity';
import { CreateInviteInput } from './inputs/create-invite.input';
import { IInviteChange } from './interfaces/invite-change.interface';
import { InvitesService } from './invites.service';

@Resolver(() => InviteRedisEntity)
export class InvitesResolver {
  constructor(
    private readonly invitesService: InvitesService,
    private readonly usersService: UsersService,
    private readonly chatsService: ChatsService,
    @Inject(PUB_SUB)
    private readonly pubsub: RedisPubSub,
  ) {}

  @Mutation(() => InviteRedisEntity)
  public createInvite(
    @CurrentUser() userId: string,
    @Args('input') input: CreateInviteInput,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.createInvite(userId, input);
  }

  @Mutation(() => InviteRedisEntity)
  public async acceptInvite(
    @CurrentUser() userId: string,
    @Args() dto: InvitationDto,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.acceptInvite(userId, dto.invitation);
  }

  @Mutation(() => InviteRedisEntity)
  public async declineInvite(
    @CurrentUser() userId: string,
    @Args() dto: InvitationDto,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.declineInvite(userId, dto.invitation);
  }

  @Mutation(() => InviteRedisEntity)
  public async updateRejectedInvite(
    @CurrentUser() userId: string,
    @Args() dto: InvitationDto,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.updateRejectedInvite(userId, dto.invitation);
  }

  @Mutation(() => LocalMessageType)
  public async deleteInvite(
    @CurrentUser() userId: string,
    @Args() dto: InviteDto,
  ): Promise<LocalMessageType> {
    return this.invitesService.deleteInvite(userId, dto.inviteId);
  }

  @Query(() => InviteRedisEntity)
  public async inviteById(
    @CurrentUser() userId: string,
    @Args() dto: InviteDto,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.inviteById(userId, dto.inviteId);
  }

  @Query(() => InviteRedisEntity)
  public async sentInviteById(
    @CurrentUser() userId: string,
    @Args() dto: InviteDto,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.sentInviteById(userId, dto.inviteId);
  }

  @Query(() => InviteRedisEntity)
  public async inviteByInvitation(
    @CurrentUser() userId: string,
    @Args() dto: InvitationDto,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.inviteByInvitation(userId, dto.invitation);
  }

  @Query(() => InviteRedisEntity)
  public async sentInviteByInvitation(
    @CurrentUser() userId: string,
    @Args() dto: InvitationDto,
  ): Promise<InviteRedisEntity> {
    return this.invitesService.sentInviteByInvitation(userId, dto.invitation);
  }

  @Query(() => PaginatedInvitesType, { name: 'receivedInvites' })
  public async filterReceivedInvites(
    @CurrentUser() userId: string,
    @Args() dto: FilterInvitesDto,
  ): Promise<IPaginated<InviteRedisEntity>> {
    return this.invitesService.filterReceivedInvites(userId, dto);
  }

  @Query(() => PaginatedInvitesType, { name: 'sentInvites' })
  public async filterSentInvites(
    @CurrentUser() userId: string,
    @Args() dto: FilterInvitesDto,
  ): Promise<IPaginated<InviteRedisEntity>> {
    return this.invitesService.filterSentInvites(userId, dto);
  }

  @Subscription(() => InviteChangeType)
  public inviteChange(@CurrentUser() userId: string) {
    return this.pubsub.asyncIterator<IInviteChange>(
      `INVITE_${userId.toUpperCase()}`,
    );
  }

  @ResolveField('sender', () => UserEntity)
  public async resolveSender(
    @Parent() invite: InviteRedisEntity,
  ): Promise<UserRedisEntity> {
    return this.usersService.userById(invite.senderId);
  }

  @ResolveField('recipient', () => UserEntity)
  public async resolveRecipient(
    @Parent() invite: InviteRedisEntity,
  ): Promise<UserRedisEntity> {
    return this.usersService.userById(invite.senderId);
  }

  @ResolveField('chat', () => ChatRedisEntity)
  public async resolveChat(
    @Parent() invite: InviteRedisEntity,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.chatByInvitation(invite.invitation);
  }
}
