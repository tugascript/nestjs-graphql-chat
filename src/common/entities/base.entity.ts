import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { Field, GraphQLTimestamp, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { Entity as RedisEntity } from 'redis-om';
import { ULID_REGEX } from '../constants/regex';
import { IBase } from '../interfaces/base.interface';

@ObjectType({ isAbstract: true })
@Entity({ abstract: true })
export abstract class LocalBaseEntity extends RedisEntity implements IBase {
  @Field(() => ID, { nullable: true })
  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  @IsOptional()
  public entityId: string;

  @PrimaryKey()
  public _id!: ObjectId;

  @Field(() => ID)
  @SerializedPrimaryKey()
  public id: string;

  @Field(() => GraphQLTimestamp)
  @Property({ onCreate: () => new Date() })
  public createdAt: Date = new Date();

  @Field(() => GraphQLTimestamp)
  @Property({ onUpdate: () => new Date() })
  public updatedAt: Date = new Date();
}
