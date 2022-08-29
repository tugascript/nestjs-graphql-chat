import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SearchDto } from '../common/dtos/search.dto';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { DescriptionDto } from './dtos/description.dto';
import { GetUserDto } from './dtos/get-user.dto';
import { OnlineStatusDto } from './dtos/online-status.dto';
import { UserDto } from './dtos/user.dto';
import { PaginatedUsersType } from './entities/gql/paginated-users.type';
import { UserEntity } from './entities/user.entity';
import { UserRedisEntity } from './entities/user.redis-entity';
import { UsersService } from './users.service';

@Resolver(() => UserEntity)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  //____________________ MUTATIONS ____________________

  @Mutation(() => UserEntity)
  public async updateOnlineStatus(
    @CurrentUser() userId: string,
    @Args() dto: OnlineStatusDto,
  ): Promise<UserRedisEntity> {
    return this.usersService.updateDefaultStatus(userId, dto);
  }

  @Mutation(() => UserEntity)
  public async updateAccountDescription(
    @CurrentUser() userId: string,
    @Args() dto: DescriptionDto,
  ): Promise<UserRedisEntity> {
    return this.usersService.updateDescription(userId, dto);
  }

  @Mutation(() => LocalMessageType)
  public async deleteAccount(
    @CurrentUser() userId: string,
    @Args('password') password: string,
  ): Promise<LocalMessageType> {
    return this.usersService.deleteUser(userId, password);
  }

  //____________________ QUERIES ____________________

  @Query(() => UserEntity)
  public async me(@CurrentUser() userId: string): Promise<UserRedisEntity> {
    return this.usersService.userById(userId);
  }

  //____________________ PUBLIC QUERIES ____________________

  @Public()
  @Query(() => UserEntity)
  public async userByUsername(
    @Args() dto: GetUserDto,
  ): Promise<UserRedisEntity> {
    return this.usersService.userByUsername(dto.username);
  }

  @Public()
  @Query(() => UserEntity)
  public async userById(@Args() dto: UserDto): Promise<UserRedisEntity> {
    return this.usersService.userById(dto.userId);
  }

  @Public()
  @Query(() => PaginatedUsersType, { name: 'users' })
  public async filterUsers(
    @Args() dto: SearchDto,
  ): Promise<IPaginated<UserEntity>> {
    return this.usersService.filterUsers(dto);
  }

  //____________________ RESOLVE FIELDS ____________________

  @ResolveField('email', () => String, { nullable: true })
  public resolveEmail(
    @Parent() user: UserEntity,
    @CurrentUser() userId: string,
  ): string | null {
    return user.id === userId ? user.email : null;
  }

  @ResolveField('defaultStatus', () => String, { nullable: true })
  public resolveDefaultStatus(
    @Parent() user: UserEntity,
    @CurrentUser() userId: string,
  ): string | null {
    return user.id === userId ? user.defaultStatus : null;
  }
}
