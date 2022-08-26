import { ObjectType } from '@nestjs/graphql';
import { Notification } from '../../../common/entities/gql/notification.type';
import { ChatEntity } from '../chat.entity';

@ObjectType('ChatNotification')
export abstract class ChatNotificationType extends Notification<ChatEntity>(
  ChatEntity,
) {}
