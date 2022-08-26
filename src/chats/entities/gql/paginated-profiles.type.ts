import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/entities/gql/paginated.type';
import { ProfileEntity } from '../profiles.entity';

@ObjectType('PaginatedProfiles')
export abstract class PaginatedProfilesType extends Paginated<ProfileEntity>(
  ProfileEntity,
) {}
