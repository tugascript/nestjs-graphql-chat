import { Field, GraphQLTimestamp, ID, ObjectType } from '@nestjs/graphql';
import { IsDate, IsString, Length, Matches } from 'class-validator';
import { Entity } from 'redis-om';
import { ULID_REGEX } from '../constants/regex';

@ObjectType({ isAbstract: true })
export abstract class RedisBaseEntity extends Entity {
  @Field(() => ID)
  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public entityId: string;

  @Field(() => GraphQLTimestamp)
  @IsDate()
  public createdAt: Date = new Date();

  @Field(() => GraphQLTimestamp)
  @IsDate()
  public updatedAt: Date = new Date();
}
