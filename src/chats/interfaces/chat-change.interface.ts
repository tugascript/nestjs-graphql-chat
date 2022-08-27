import { IChange } from '../../common/interfaces/change.interface';
import { ChatRedisEntity } from '../entities/chat.redis-entity';

export interface IChatChange {
  chatChange: IChange<ChatRedisEntity>;
}
