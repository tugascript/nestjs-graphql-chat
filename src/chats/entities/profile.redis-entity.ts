import { Field, ObjectType } from '@nestjs/graphql';
import { IsMongoId, IsString, Length, Matches } from 'class-validator';
import { Schema } from 'redis-om';
import {
  NAME_REGEX,
  SLUG_REGEX,
  ULID_REGEX,
} from '../../common/constants/regex';
import { BaseRedisEntity } from '../../common/entities/base.redis-entity';
import { getNowUnix, getUnix } from '../utils/get-now-unix.util';

@ObjectType('Profile')
export class ProfileRedisEntity extends BaseRedisEntity {
  @Field(() => String)
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public nickname: string;

  @Field(() => String)
  @IsString()
  @Length(3, 109)
  @Matches(SLUG_REGEX)
  public slug: string;

  @IsString()
  @IsMongoId()
  public userId: string;

  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public chatId: string;

  public endOfLife(): number {
    return getUnix(this.createdAt) + this.time;
  }

  public expiration(): number {
    return this.endOfLife() - getNowUnix();
  }
}

export const profileSchema = new Schema(ProfileRedisEntity, {
  nickname: { type: 'string' },
  slug: { type: 'string' },
  time: { type: 'number' },
  userId: { type: 'string' },
  chatId: { type: 'string' },
  createdAt: { type: 'date', sortable: true },
  updatedAt: { type: 'date' },
});
