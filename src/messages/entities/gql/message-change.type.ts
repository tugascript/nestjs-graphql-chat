import { ObjectType } from '@nestjs/graphql';
import { Change } from '../../../common/entities/gql/change.type';
import { ChatMessageRedisEntity } from '../chat-message.redis-entity';

@ObjectType('MessageChange')
export abstract class MessageChangeType extends Change<ChatMessageRedisEntity>(
  ChatMessageRedisEntity,
) {}
