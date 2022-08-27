/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Entity, Enum, OptionalProps, Property, Unique } from '@mikro-orm/core';
import { Field, GraphQLTimestamp, ObjectType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import {
  BCRYPT_HASH,
  NAME_REGEX,
  SLUG_REGEX,
} from '../../common/constants/regex';
import { LocalBaseEntity } from '../../common/entities/base.entity';
import { OnlineStatusEnum } from '../enums/online-status.enum';
import { IUser } from '../interfaces/user.interface';

@ObjectType('User')
@Entity()
export class UserEntity extends LocalBaseEntity implements IUser {
  [OptionalProps]?:
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'picture'
    | 'onlineStatus'
    | 'defaultStatus'
    | 'confirmed'
    | 'suspended'
    | 'twoFactor'
    | 'credentials'
    | 'lastLogin'
    | 'lastOnline';

  @Field(() => String)
  @Property()
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public name!: string;

  @Field(() => String)
  @Property()
  @Unique()
  @IsString()
  @Length(3, 110)
  @Matches(SLUG_REGEX)
  public username!: string;

  @Field(() => String, { nullable: true })
  @Property()
  @Unique()
  @IsEmail()
  public email!: string;

  @Field(() => String, { nullable: true })
  @Property({ nullable: true })
  @IsString()
  @Length(1, 500)
  @IsOptional()
  public description?: string;

  @Property()
  @IsString()
  @Length(59, 60)
  @Matches(BCRYPT_HASH)
  public password!: string;

  @Field(() => OnlineStatusEnum)
  @Enum({
    items: () => OnlineStatusEnum,
    default: OnlineStatusEnum.OFFLINE,
    columnType: 'varchar(14)',
  })
  @IsEnum(OnlineStatusEnum)
  public onlineStatus: OnlineStatusEnum = OnlineStatusEnum.OFFLINE;

  @Field(() => OnlineStatusEnum, { nullable: true })
  @Enum({
    items: () => OnlineStatusEnum,
    default: OnlineStatusEnum.ONLINE,
    columnType: 'varchar(14)',
  })
  @IsEnum(OnlineStatusEnum)
  public defaultStatus: OnlineStatusEnum = OnlineStatusEnum.ONLINE;

  @Property({ default: false })
  @IsBoolean()
  public confirmed: boolean = false;

  @Property({ default: false })
  @IsBoolean()
  public suspended: boolean = false;

  @Property({ default: false })
  @IsBoolean()
  public twoFactor: boolean = false;

  @Property({ default: 1 })
  @IsInt()
  @Min(1)
  public count: number = 1;

  @Field(() => GraphQLTimestamp)
  @Property()
  @IsDate()
  public lastLogin: Date = new Date();

  @Field(() => GraphQLTimestamp)
  @Property()
  @IsDate()
  public lastOnline: Date = new Date();
}
