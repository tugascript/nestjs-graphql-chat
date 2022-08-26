import { FilterQuery } from '@mikro-orm/core';
import { EntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcrypt';
import { Cache } from 'cache-manager';
import { Repository } from 'redis-om';
import { v4 as uuidV4, v5 as uuidV5 } from 'uuid';
import { RegisterDto } from '../auth/dtos/register.dto';
import { ISessionsData } from '../auth/interfaces/sessions-data.interface';
import { ITokenPayload } from '../auth/interfaces/token-payload.interface';
import { CommonService } from '../common/common.service';
import { SearchDto } from '../common/dtos/search.dto';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { getAfterCursor } from '../common/enums/after-cursor.enum';
import { getUserQueryCursor } from '../common/enums/query-cursor.enum';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { RedisClientService } from '../redis-client/redis-client.service';
import { UploaderService } from '../uploader/uploader.service';
import { OnlineStatusDto } from './dtos/online-status.dto';
import { UserEntity, userSchema } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly wsNamespace = this.configService.get<string>('WS_UUID');
  private readonly wsAccessTime =
    this.configService.get<number>('jwt.wsAccess.time');
  private readonly usersRedisRepo: Repository<UserEntity>;

  constructor(
    private readonly redisClient: RedisClientService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: EntityRepository<UserEntity>,
    private readonly commonService: CommonService,
    private readonly uploaderService: UploaderService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.usersRedisRepo = this.redisClient.fetchRepository(userSchema);
  }

  public async onModuleInit(): Promise<void> {
    await this.usersRedisRepo.createIndex();
  }

  //____________________ MUTATIONS ____________________

  /**
   * Create User
   *
   * Creates a new user and saves him in db
   */
  public async createUser({
    name,
    email,
    password1,
    password2,
  }: RegisterDto): Promise<UserEntity> {
    if (password1 !== password2)
      throw new BadRequestException('Passwords do not match');

    name = this.commonService.formatTitle(name);
    email = email.toLowerCase();
    const password = await hash(password1, 10);
    let username = this.commonService.generatePointSlug(name);

    if (username.length >= 3) {
      const count = await this.usersRepository.count({
        username: new RegExp(`^${username}`, 'i'),
      });
      if (count > 0) username += count.toString();
    } else {
      username = uuidV4();
    }

    const user = this.usersRepository.create({
      name,
      username,
      email,
      password,
    });
    await this.saveUserToDb(user, true);
    return this.createRedisUser(user);
  }

  /**
   * Update Default Status
   *
   * Updates the default online status of current user
   */
  public async updateDefaultStatus(
    userId: string,
    { defaultStatus }: OnlineStatusDto,
  ): Promise<LocalMessageType> {
    const user = await this.userById(userId);
    user.defaultStatus = defaultStatus;

    const userUuid = uuidV5(userId.toString(), this.wsNamespace);
    const sessionData = await this.commonService.throwInternalError(
      this.cacheManager.get<ISessionsData>(userUuid),
    );

    if (sessionData) {
      user.onlineStatus = defaultStatus;
      await this.commonService.throwInternalError(
        this.cacheManager.set<ISessionsData>(userUuid, sessionData, {
          ttl: this.wsAccessTime,
        }),
      );
    }

    await this.saveUserToDb(user);
    return new LocalMessageType('Default status changed successfully');
  }

  /**
   * Delete User
   *
   * Deletes current user account
   */
  public async deleteUser(
    userId: string,
    password: string,
  ): Promise<LocalMessageType> {
    const user = await this.userById(userId);

    if (password.length > 1 && !(await compare(password, user.password)))
      throw new BadRequestException('Wrong password!');

    try {
      await this.cacheManager.del(uuidV5(userId.toString(), this.wsNamespace));
    } catch (_) {}

    await this.commonService.removeEntity(this.usersRepository, user);
    return new LocalMessageType('Account deleted successfully');
  }

  //____________________ QUERIES ____________________

  /**
   * Get User For Auth
   *
   * Gets a user by email for auth
   */
  public async getUserForAuth(email: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ email });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  /**
   * Get Uncheck User
   *
   * Gets a user by email and does not check if it exists
   */
  public async getUncheckUser(
    email: string,
  ): Promise<UserEntity | undefined | null> {
    const redisUser = await this.usersRedisRepo
      .search()
      .where('email')
      .equals(email)
      .return.first();

    if (redisUser) return redisUser;

    return this.usersRepository.findOne({ email });
  }

  /**
   * Get Uncheck User by ID
   *
   * Gets a user by id and does not check if it exists
   */
  public async getUncheckUserById(
    id: string,
  ): Promise<UserEntity | undefined | null> {
    const redisUser = await this.usersRedisRepo
      .search()
      .where('id')
      .equals(id)
      .return.first();

    if (redisUser) return redisUser;

    return this.usersRepository.findOne({ _id: new ObjectId(id) });
  }

  /**
   * Get User By Payload
   *
   * Gets user by jwt payload for auth
   */
  public async getUserByPayload({
    id,
    count,
  }: ITokenPayload): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      _id: new ObjectId(id),
      count,
    });
    if (!user)
      throw new UnauthorizedException('Token is invalid or has expired');
    return user;
  }

  /**
   * Get User By ID
   *
   * Gets user by id, usually the current logged-in user
   */
  public async userById(id: string): Promise<UserEntity> {
    let redisUser = await this.usersRedisRepo
      .search()
      .where('id')
      .equals(id)
      .return.first();

    if (!redisUser) {
      const user = await this.mongoUserById(id);
      redisUser = await this.createRedisUser(user);
    }

    return redisUser;
  }

  public async mongoUserById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      _id: new ObjectId(id),
    });
    this.commonService.checkExistence('User', user);
    return user;
  }

  /**
   * User By Username
   *
   * Gets user by username, usually for the profile (if it exists)
   */
  public async userByUsername(username: string): Promise<UserEntity> {
    let redisUser = await this.usersRedisRepo
      .search()
      .where('username')
      .equals(username)
      .return.first();

    if (!redisUser) {
      const user = await this.usersRepository.findOne({ username });
      this.commonService.checkExistence('User', user);
      redisUser = await this.createRedisUser(user);
    }

    return redisUser;
  }

  /**
   * Find Users
   *
   * Search users usernames and returns paginated results
   */
  public async filterUsers({
    search,
    order,
    cursor,
    first,
    after,
  }: SearchDto): Promise<IPaginated<UserEntity>> {
    const where: FilterQuery<UserEntity> = {
      confirmed: true,
    };

    if (search) {
      const regSearch = this.commonService.formatSearch(search);
      where['$or'] = [
        {
          name: regSearch,
        },
        {
          description: regSearch,
        },
      ];
    }

    return await this.commonService.findAndCountPagination(
      getUserQueryCursor(cursor),
      first,
      order,
      this.usersRepository,
      where,
      after,
      getAfterCursor(cursor),
    );
  }

  /**
   * Save User To Database
   *
   * Inserts or updates user in the database.
   * This method exists because saving the user has
   * to be shared with the auth service.
   */
  public async saveUserToDb(user: UserEntity, isNew = false): Promise<void> {
    await this.commonService.saveEntity(this.usersRepository, user, isNew);
  }

  public async updateRedisUser(user: UserEntity): Promise<UserEntity> {
    const redisUser = await this.usersRedisRepo
      .search()
      .where('id')
      .equals(user.id)
      .return.first();

    if (redisUser) {
      for (const key in user) {
        if (
          redisUser.hasOwnProperty(key) &&
          user.hasOwnProperty(key) &&
          redisUser[key] !== user[key]
        ) {
          redisUser[key] = user[key];
        }
      }

      await this.commonService.saveRedisEntity(
        this.usersRedisRepo,
        redisUser,
        604800,
      );
      return redisUser;
    }

    return this.createRedisUser(user);
  }

  //____________________ OTHER ____________________

  private async createRedisUser(user: UserEntity): Promise<UserEntity> {
    const redisUser = this.usersRedisRepo.createEntity({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      description: user.description,
      password: user.password,
      onlineStatus: user.onlineStatus,
      defaultStatus: user.defaultStatus,
      confirmed: user.confirmed,
      suspended: user.suspended,
      twoFactor: user.twoFactor,
      count: user.count,
      lastLogin: user.lastLogin,
      lastOnline: user.lastOnline,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    await this.commonService.saveRedisEntity(
      this.usersRedisRepo,
      redisUser,
      604800,
    );
    return user;
  }
}
