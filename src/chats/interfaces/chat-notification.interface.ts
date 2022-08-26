import { INotification } from '../../common/interfaces/notification.interface';
import { ChatEntity } from '../entities/chat.entity';

export interface IChatNotification {
  chatNotification: INotification<ChatEntity>;
}
