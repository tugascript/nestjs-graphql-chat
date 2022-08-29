import { IChange } from '../../common/interfaces/change.interface';
import { InviteRedisEntity } from '../entities/invite.redis-entity';

export interface IInviteChange {
  inviteChange: IChange<InviteRedisEntity>;
}
