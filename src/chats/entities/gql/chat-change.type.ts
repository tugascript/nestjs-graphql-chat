import { ObjectType } from '@nestjs/graphql';
import { Change } from '../../../common/entities/gql/change.type';
import { ChatRedisEntity } from '../chat.redis-entity';

@ObjectType('ChatChange')
export abstract class ChatChangeType extends Change<ChatRedisEntity>(
  ChatRedisEntity,
) {}
