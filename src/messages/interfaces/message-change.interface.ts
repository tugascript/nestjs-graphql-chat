import { IChange } from '../../common/interfaces/change.interface';
import { ChatMessageRedisEntity } from '../entities/chat-message.redis-entity';

export interface IMessageChange {
  messageChange: IChange<ChatMessageRedisEntity>;
}
