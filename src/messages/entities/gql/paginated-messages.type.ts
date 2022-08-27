import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/entities/gql/paginated.type';
import { ChatMessageRedisEntity } from '../chat-message.redis-entity';

@ObjectType('PaginatedMessages')
export abstract class PaginatedMessagesType extends Paginated<ChatMessageRedisEntity>(
  ChatMessageRedisEntity,
) {}
