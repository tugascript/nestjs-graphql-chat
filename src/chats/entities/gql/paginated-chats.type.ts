import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/entities/gql/paginated.type';
import { ChatEntity } from '../chat.entity';

@ObjectType('PaginatedChats')
export abstract class PaginatedChatsType extends Paginated<ChatEntity>(
  ChatEntity,
) {}
