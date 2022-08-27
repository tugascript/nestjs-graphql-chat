import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/entities/gql/paginated.type';
import { ChatRedisEntity } from '../chat.redis-entity';

@ObjectType('PaginatedChats')
export abstract class PaginatedChatsType extends Paginated<ChatRedisEntity>(
  ChatRedisEntity,
) {}
