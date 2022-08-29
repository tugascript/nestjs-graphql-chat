import { ObjectType } from '@nestjs/graphql';
import { Change } from '../../../common/entities/gql/change.type';
import { InviteRedisEntity } from '../invite.redis-entity';

@ObjectType('InviteChange')
export abstract class InviteChangeType extends Change<InviteRedisEntity>(
  InviteRedisEntity,
) {}
