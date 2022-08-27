import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/entities/gql/paginated.type';
import { ProfileRedisEntity } from '../profile.redis-entity';

@ObjectType('PaginatedProfiles')
export abstract class PaginatedProfilesType extends Paginated<ProfileRedisEntity>(
  ProfileRedisEntity,
) {}
