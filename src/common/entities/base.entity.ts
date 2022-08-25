import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { Field, GraphQLTimestamp, ID, ObjectType } from '@nestjs/graphql';
import { IBase } from '../interfaces/base.interface';

@ObjectType({ isAbstract: true })
@Entity({ abstract: true })
export abstract class LocalBaseEntity implements IBase {
  @PrimaryKey()
  public _id!: ObjectId;

  @Field(() => ID)
  @SerializedPrimaryKey()
  public id: number;

  @Field(() => GraphQLTimestamp)
  @Property({ onCreate: () => new Date() })
  public createdAt: Date = new Date();

  @Field(() => GraphQLTimestamp)
  @Property({ onUpdate: () => new Date() })
  public updatedAt: Date = new Date();
}
