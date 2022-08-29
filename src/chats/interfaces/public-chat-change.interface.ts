import { IChange } from '../../common/interfaces/change.interface';
import { ChatRedisEntity } from '../entities/chat.redis-entity';

export interface IPublicChatChange {
  publicChatChange: IChange<ChatRedisEntity>;
}
