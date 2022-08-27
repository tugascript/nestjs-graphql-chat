import { Field, GraphQLTimestamp, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  IsDate,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Entity } from 'redis-om';
import { getNowUnix, getUnix } from '../../chats/utils/get-now-unix.util';
import { ULID_REGEX } from '../constants/regex';

@ObjectType({ isAbstract: true })
export abstract class BaseRedisEntity extends Entity {
  @Field(() => ID)
  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public entityId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(86400)
  public time: number;

  @Field(() => GraphQLTimestamp)
  @IsDate()
  public createdAt: Date = new Date();

  @Field(() => GraphQLTimestamp)
  @IsDate()
  public updatedAt: Date = new Date();

  public endOfLife(): number {
    return getUnix(this.createdAt) + this.time;
  }

  public expiration(): number {
    return this.endOfLife() - getNowUnix();
  }
}
