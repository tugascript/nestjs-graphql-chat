import { ObjectType } from '@nestjs/graphql';
import { Change } from '../../../common/entities/gql/change.type';
import { ProfileRedisEntity } from '../profile.redis-entity';

@ObjectType('ProfileChange')
export abstract class ProfileChangeType extends Change<ProfileRedisEntity>(
  ProfileRedisEntity,
) {}
