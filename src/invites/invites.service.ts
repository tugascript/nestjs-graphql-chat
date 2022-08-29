import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Repository } from 'redis-om';
import { ChatsService } from '../chats/chats.service';
import { CommonService } from '../common/common.service';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { AfterCursorEnum } from '../common/enums/after-cursor.enum';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { QueryOrderEnum } from '../common/enums/query-order.enum';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { PUB_SUB } from '../pubsub/pubsub.module';
import { RedisClientService } from '../redis-client/redis-client.service';
import { UsersService } from '../users/users.service';
import { FilterInvitesDto } from './dtos/filter-invites.dto';
import {
  InviteRedisEntity,
  inviteSchema,
} from './entities/invite.redis-entity';
import { InviteStatusEnum } from './enums/invite-status.enum';
import { CreateInviteInput } from './inputs/create-invite.input';
import { IInviteChange } from './interfaces/invite-change.interface';

@Injectable()
export class InvitesService implements OnModuleInit {
  private readonly inviteRepository: Repository<InviteRedisEntity>;

  constructor(
    private readonly redisClient: RedisClientService,
    private readonly commonService: CommonService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
    public readonly usersService: UsersService,
    @Inject(PUB_SUB)
    private readonly pubsub: RedisPubSub,
  ) {
    this.inviteRepository = redisClient.fetchRepository(inviteSchema);
  }

  public async onModuleInit() {
    await this.inviteRepository.createIndex();
  }

  public async createInvite(
    userId: string,
    { invitation, recipientId }: CreateInviteInput,
  ): Promise<InviteRedisEntity> {
    await this.usersService.userById(recipientId);
    const chat = await this.chatsService.chatByInvitation(invitation);

    if (
      !(await this.chatsService.checkProfileExistence(userId, chat.entityId))
    ) {
      throw new NotFoundException(
        'Chat does not exist or you are not a member of it',
      );
    }
    if (
      await this.chatsService.checkProfileExistence(recipientId, chat.entityId)
    ) {
      throw new BadRequestException('User is already a member of this chat');
    }

    const count = await this.inviteRepository
      .search()
      .where('recipientId')
      .equals(recipientId)
      .and('invitation')
      .equals(invitation)
      .return.count();

    if (count > 0)
      throw new BadRequestException(
        'User already received an invite for this chat',
      );

    const time = chat.expiration();
    const invite = await this.inviteRepository.createEntity({
      time,
      invitation,
      recipientId,
      senderId: userId,
    });
    await this.commonService.saveRedisEntity(
      this.inviteRepository,
      invite,
      time,
    );
    this.publishInviteChange(invite, ChangeTypeEnum.NEW);
    return invite;
  }

  public async acceptInvite(
    userId: string,
    invitation: string,
  ): Promise<InviteRedisEntity> {
    const invite = await this.inviteByInvitation(userId, invitation);

    if (invite.status !== InviteStatusEnum.PENDING)
      throw new BadRequestException('Invite already answered');

    invite.status = InviteStatusEnum.ACCEPTED;
    await this.chatsService.createProfile(userId, invitation);
    await this.commonService.saveRedisEntity(
      this.inviteRepository,
      invite,
      invite.expiration(),
    );
    this.publishInviteChange(invite, ChangeTypeEnum.UPDATE);
    return invite;
  }

  public async declineInvite(
    userId: string,
    invitation: string,
  ): Promise<InviteRedisEntity> {
    const invite = await this.inviteByInvitation(userId, invitation);

    if (invite.status !== InviteStatusEnum.PENDING)
      throw new BadRequestException('Invite already answered');

    invite.status = InviteStatusEnum.DECLINED;
    await this.commonService.saveRedisEntity(
      this.inviteRepository,
      invite,
      invite.expiration(),
    );
    this.publishInviteChange(invite, ChangeTypeEnum.UPDATE);
    return invite;
  }

  public async updateRejectedInvite(
    userId: string,
    invitation: string,
  ): Promise<InviteRedisEntity> {
    const invite = await this.inviteByInvitation(userId, invitation);

    if (invite.status === InviteStatusEnum.ACCEPTED)
      throw new BadRequestException('Invite already accepted');

    invite.status = InviteStatusEnum.ACCEPTED;
    await this.commonService.saveRedisEntity(
      this.inviteRepository,
      invite,
      invite.expiration(),
    );
    this.publishInviteChange(invite, ChangeTypeEnum.UPDATE);
    return invite;
  }

  public async deleteInvite(
    userId: string,
    invitationId: string,
  ): Promise<LocalMessageType> {
    const invite = await this.inviteRepository.fetch(invitationId);

    if (!invite || invite.senderId !== userId)
      throw new NotFoundException('Invite not found or you are not the sender');
    if (invite.status !== InviteStatusEnum.PENDING)
      throw new BadRequestException('You can not delete answered invites');

    await this.commonService.removeRedisEntity(this.inviteRepository, invite);
    this.publishInviteChange(invite, ChangeTypeEnum.DELETE);
    return new LocalMessageType('Invite deleted successfully');
  }

  public async inviteById(
    userId: string,
    inviteId: string,
  ): Promise<InviteRedisEntity> {
    const invite = await this.inviteRepository.fetch(inviteId);

    if (!invite || invite.recipientId !== userId)
      throw new NotFoundException(
        'Invite not found or you are not the recipient',
      );

    return invite;
  }

  public async sentInviteById(
    userId: string,
    inviteId: string,
  ): Promise<InviteRedisEntity> {
    const invite = await this.inviteRepository.fetch(inviteId);

    if (!invite || invite.senderId !== userId)
      throw new NotFoundException('Invite not found or you are not the sender');

    return invite;
  }

  public async inviteByInvitation(
    userId: string,
    invitation: string,
  ): Promise<InviteRedisEntity> {
    const invite = await this.inviteRepository
      .search()
      .where('recipientId')
      .equals(userId)
      .and('invitation')
      .equals(invitation)
      .return.first();
    if (!invite)
      throw new NotFoundException(
        'Invite not found or you are not the recipient',
      );
    return invite;
  }

  public async sentInviteByInvitation(
    userId: string,
    invitation: string,
  ): Promise<InviteRedisEntity> {
    const invite = await this.inviteRepository
      .search()
      .where('senderId')
      .equals(userId)
      .and('invitation')
      .equals(invitation)
      .return.first();

    if (!invite)
      throw new NotFoundException('Invite not found or you are not the sender');

    return invite;
  }

  public async filterReceivedInvites(
    userId: string,
    { status, first, after }: FilterInvitesDto,
  ): Promise<IPaginated<InviteRedisEntity>> {
    return this.commonService.redisPagination(
      'createdAt',
      first,
      QueryOrderEnum.DESC,
      this.inviteRepository,
      (r) => {
        const qb = r.search().where('recipientId').equals(userId);

        if (status) qb.and('status').equals(status);

        return qb;
      },
      after,
      AfterCursorEnum.DATE,
    );
  }

  public async filterSentInvites(
    userId: string,
    { status, first, after }: FilterInvitesDto,
  ): Promise<IPaginated<InviteRedisEntity>> {
    return this.commonService.redisPagination(
      'createdAt',
      first,
      QueryOrderEnum.DESC,
      this.inviteRepository,
      (r) => {
        const qb = r.search().where('senderId').equals(userId);

        if (status) qb.and('status').equals(status);

        return qb;
      },
      after,
      AfterCursorEnum.DATE,
    );
  }

  public async deleteChatInvites(invitation: string): Promise<void> {
    const invites = await this.inviteRepository
      .search()
      .where('invitation')
      .equals(invitation)
      .return.all();

    for (const invite of invites) {
      await this.commonService.removeRedisEntity(this.inviteRepository, invite);
      this.publishInviteChange(invite, ChangeTypeEnum.DELETE);
    }
  }

  public async deleteUserInvites(userId: string): Promise<void> {
    const invites = await this.inviteRepository
      .search()
      .where('senderId')
      .equals(userId)
      .or('recipientId')
      .equals(userId)
      .return.all();

    for (const invite of invites) {
      await this.commonService.removeRedisEntity(this.inviteRepository, invite);
      this.publishInviteChange(invite, ChangeTypeEnum.DELETE);
    }
  }

  private publishInviteChange(
    invite: InviteRedisEntity,
    changeType: ChangeTypeEnum,
  ) {
    const inviteChange = this.commonService.generateChange(
      invite,
      changeType,
      'createdAt',
    );
    this.pubsub.publish<IInviteChange>(
      `INVITE_${invite.recipientId.toUpperCase()}`,
      { inviteChange },
    );
    this.pubsub.publish<IInviteChange>(
      `INVITE_${invite.senderId.toUpperCase()}`,
      { inviteChange },
    );
  }
}
