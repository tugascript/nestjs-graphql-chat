import { Schema } from 'redis-om';
import { getUnix } from '../../chats/utils/get-now-unix.util';
import { BaseRedisEntity } from '../../common/entities/base.redis-entity';
import { OnlineStatusEnum } from '../enums/online-status.enum';
import { IUser } from '../interfaces/user.interface';

export class UserRedisEntity extends BaseRedisEntity implements IUser {
  public id: string;
  public name!: string;
  public username!: string;
  public email!: string;
  public description?: string;
  public password!: string;
  public onlineStatus: OnlineStatusEnum;
  public defaultStatus: OnlineStatusEnum;
  public confirmed: boolean = false;
  public suspended: boolean;
  public twoFactor: boolean;
  public count: number;
  public lastLogin: Date;
  public lastOnline: Date;

  public endOfLife(): number {
    return getUnix(this.updatedAt) + 86400;
  }
}

export const userSchema = new Schema(UserRedisEntity, {
  id: { type: 'string' },
  name: { type: 'string' },
  username: { type: 'string' },
  email: { type: 'string' },
  description: { type: 'string' },
  password: { type: 'string' },
  onlineStatus: { type: 'string' },
  defaultStatus: { type: 'string' },
  confirmed: { type: 'boolean' },
  suspended: { type: 'boolean' },
  twoFactor: { type: 'boolean' },
  time: { type: 'number' },
  count: { type: 'number' },
  lastLogin: { type: 'date' },
  lastOnline: { type: 'date' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
});
