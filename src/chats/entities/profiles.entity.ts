import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { Schema } from 'redis-om';
import {
  NAME_REGEX,
  SLUG_REGEX,
  ULID_REGEX,
} from '../../common/constants/regex';
import { RedisBaseEntity } from '../../common/entities/redis-base.entity';

@ObjectType('Profile')
export class ProfileEntity extends RedisBaseEntity {
  @Field(() => String)
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public nickName: string;

  @Field(() => String)
  @IsString()
  @Length(3, 109)
  @Matches(SLUG_REGEX)
  public slug: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  public time: number;

  @IsString()
  @IsUUID()
  public userId: string;

  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public chatId: string;
}

export const profileSchema = new Schema(ProfileEntity, {
  nickName: { type: 'string' },
  slug: { type: 'string' },
  time: { type: 'number' },
  userId: { type: 'string' },
  chatId: { type: 'string' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
});
