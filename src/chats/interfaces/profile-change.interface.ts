import { IChange } from '../../common/interfaces/change.interface';
import { ProfileRedisEntity } from '../entities/profile.redis-entity';

export interface IProfileChange {
  profileChange: IChange<ProfileRedisEntity>;
}
