import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/entities/gql/paginated.type';
import { InviteRedisEntity } from '../invite.redis-entity';

@ObjectType('PaginatedInvites')
export abstract class PaginatedInvitesType extends Paginated<InviteRedisEntity>(
  InviteRedisEntity,
) {}
