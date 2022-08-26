import {
  Args,
  Context,
  Mutation,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PubSub } from 'mercurius';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LocalMessageType } from '../../common/entities/gql/message.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { UserEntity } from '../../users/entities/user.entity';
import { ChatsService } from '../chats.service';
import { ChatDto } from '../dtos/chat.dto';
import { FilterProfilesDto } from '../dtos/filter-profiles.dto';
import { InvitationDto } from '../dtos/invitation.dto';
import { ProfileSlugDto } from '../dtos/profile-slug.dto';
import { ProfileDto } from '../dtos/profile.dto';
import { PaginatedProfilesType } from '../entities/gql/paginated-profiles.type';
import { ProfileEntity } from '../entities/profiles.entity';
import { UpdateNicknameInput } from '../inputs/update-nickname.input';
import { UpdateProfileNicknameInput } from '../inputs/update-profile-nickname.input';

@Resolver(() => ProfileEntity)
export class ProfilesResolver {
  constructor(private readonly chatsService: ChatsService) {}

  @Mutation(() => ProfileEntity)
  public createProfile(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args() dto: InvitationDto,
  ): Promise<ProfileEntity> {
    return this.chatsService.createProfile(pubsub, userId, dto.invitation);
  }

  @Query(() => PaginatedProfilesType, { name: 'chatProfiles' })
  public filterProfiles(
    @CurrentUser() userId: string,
    @Args() dto: FilterProfilesDto,
  ): Promise<IPaginated<ProfileEntity>> {
    return this.chatsService.filterProfiles(userId, dto);
  }

  @Query(() => ProfileEntity)
  public async profileById(
    @CurrentUser() userId: string,
    @Args() dto: ProfileDto,
  ): Promise<ProfileEntity> {
    return this.chatsService.profileById(userId, dto);
  }

  @Query(() => ProfileEntity)
  public async profileBySlug(
    @CurrentUser() userId: string,
    @Args() dto: ProfileSlugDto,
  ): Promise<ProfileEntity> {
    return this.chatsService.profileBySlug(userId, dto);
  }

  @Mutation(() => ProfileEntity)
  public async updateOwnNickname(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args('input') input: UpdateNicknameInput,
  ): Promise<ProfileEntity> {
    return this.chatsService.updateOwnNickname(pubsub, userId, input);
  }

  @Mutation(() => ProfileEntity)
  public async updateProfileNickname(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args('input') input: UpdateProfileNicknameInput,
  ): Promise<ProfileEntity> {
    return this.chatsService.updateProfileNickname(pubsub, userId, input);
  }

  @Mutation(() => LocalMessageType)
  public async leaveChat(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args() dto: ChatDto,
  ): Promise<LocalMessageType> {
    return this.chatsService.leaveChat(pubsub, userId, dto.chatId);
  }

  @Mutation(() => LocalMessageType)
  public async removeProfile(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() userId: string,
    @Args() dto: ProfileDto,
  ): Promise<LocalMessageType> {
    return this.chatsService.removeProfile(pubsub, userId, dto);
  }

  // Logic in loaders
  @ResolveField('user', () => UserEntity)
  public resolveUser() {
    return;
  }
}
