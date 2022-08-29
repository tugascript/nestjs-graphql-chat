import {
  Entity,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IBase } from '../interfaces/base.interface';

@ObjectType({ isAbstract: true })
@Entity({ abstract: true })
export abstract class LocalBaseEntity implements IBase {
  @PrimaryKey()
  public _id!: ObjectId;

  @Field(() => ID)
  @SerializedPrimaryKey()
  public id: string;

  @Field(() => String)
  @Property({ onCreate: () => new Date() })
  public createdAt: Date = new Date();

  @Field(() => String)
  @Property({ onUpdate: () => new Date() })
  public updatedAt: Date = new Date();
}
