import { Inject } from '@nestjs/common';
import {
  Args,
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
import { LocalMessageType } from '../../common/entities/gql/message.type';
import { contextToUser } from '../../common/helpers/context-to-user';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { ICtx } from '../../config/interfaces/ctx.interface';
import { PUB_SUB } from '../../pubsub/pubsub.module';
import { UserEntity } from '../../users/entities/user.entity';
import { UserRedisEntity } from '../../users/entities/user.redis-entity';
import { UsersService } from '../../users/users.service';
import { ChatsService } from '../chats.service';
import { ChatDto } from '../dtos/chat.dto';
import { FilterProfilesDto } from '../dtos/filter-profiles.dto';
import { InvitationDto } from '../dtos/invitation.dto';
import { ProfileSlugDto } from '../dtos/profile-slug.dto';
import { ProfileDto } from '../dtos/profile.dto';
import { ChatRedisEntity } from '../entities/chat.redis-entity';
import { PaginatedProfilesType } from '../entities/gql/paginated-profiles.type';
import { ProfileChangeType } from '../entities/gql/profile-change.type';
import { ProfileRedisEntity } from '../entities/profile.redis-entity';
import { UpdateNicknameInput } from '../inputs/update-nickname.input';
import { UpdateProfileNicknameInput } from '../inputs/update-profile-nickname.input';
import { IProfileChange } from '../interfaces/profile-change.interface';

@Resolver(() => ProfileRedisEntity)
export class ProfilesResolver {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
    @Inject(PUB_SUB)
    private readonly pubsub: RedisPubSub,
  ) {}

  @Mutation(() => ProfileRedisEntity)
  public createProfile(
    @CurrentUser() userId: string,
    @Args() dto: InvitationDto,
  ): Promise<ProfileRedisEntity> {
    return this.chatsService.createProfile(userId, dto.invitation);
  }

  @Query(() => PaginatedProfilesType, { name: 'chatProfiles' })
  public filterProfiles(
    @CurrentUser() userId: string,
    @Args() dto: FilterProfilesDto,
  ): Promise<IPaginated<ProfileRedisEntity>> {
    return this.chatsService.filterProfiles(userId, dto);
  }

  @Query(() => ProfileRedisEntity)
  public async profileById(
    @CurrentUser() userId: string,
    @Args() dto: ProfileDto,
  ): Promise<ProfileRedisEntity> {
    return this.chatsService.profileById(userId, dto);
  }

  @Query(() => ProfileRedisEntity)
  public async profileBySlug(
    @CurrentUser() userId: string,
    @Args() dto: ProfileSlugDto,
  ): Promise<ProfileRedisEntity> {
    return this.chatsService.profileBySlug(userId, dto);
  }

  @Mutation(() => ProfileRedisEntity)
  public async updateOwnNickname(
    @CurrentUser() userId: string,
    @Args('input') input: UpdateNicknameInput,
  ): Promise<ProfileRedisEntity> {
    return this.chatsService.updateOwnNickname(userId, input);
  }

  @Mutation(() => ProfileRedisEntity)
  public async updateProfileNickname(
    @CurrentUser() userId: string,
    @Args('input') input: UpdateProfileNicknameInput,
  ): Promise<ProfileRedisEntity> {
    return this.chatsService.updateProfileNickname(userId, input);
  }

  @Mutation(() => LocalMessageType)
  public async leaveChat(
    @CurrentUser() userId: string,
    @Args() dto: ChatDto,
  ): Promise<LocalMessageType> {
    return this.chatsService.leaveChat(userId, dto.chatId);
  }

  @Mutation(() => LocalMessageType)
  public async removeProfile(
    @CurrentUser() userId: string,
    @Args() dto: ProfileDto,
  ): Promise<LocalMessageType> {
    return this.chatsService.removeProfile(userId, dto);
  }

  @Subscription(() => ProfileChangeType, {
    async filter(
      this: ProfilesResolver,
      payload: IProfileChange,
      args: ChatDto,
      context: ICtx,
    ): Promise<boolean> {
      const user = contextToUser(context);
      return this.chatsService.checkProfileExistence(user, args.chatId);
    },
  })
  public async profileChange(@Args() dto: ChatDto) {
    return this.pubsub.asyncIterator<IProfileChange>(
      `PROFILES_${dto.chatId.toUpperCase()}`,
    );
  }

  @ResolveField('endOfLife', () => String)
  public resolveEndOfLife(@Parent() profile: ProfileRedisEntity): Date {
    return new Date(profile.endOfLife() * 1000);
  }

  @ResolveField('expiration', () => Int)
  public resolveExpiration(@Parent() profile: ProfileRedisEntity): number {
    return profile.expiration();
  }

  @ResolveField('chat', () => ChatRedisEntity)
  public async resolveChat(
    @Parent() profile: ProfileRedisEntity,
  ): Promise<ChatRedisEntity> {
    return this.chatsService.uncheckedChatById(profile.chatId);
  }

  // Logic in loaders
  @ResolveField('user', () => UserEntity)
  public async resolveUser(
    @Parent() profile: ProfileRedisEntity,
  ): Promise<UserRedisEntity> {
    return this.usersService.userById(profile.userId);
  }
}
