import { Field, ObjectType } from '@nestjs/graphql';
import {
  IsBase64,
  IsEnum,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { Schema } from 'redis-om';
import { NAME_REGEX, SLUG_REGEX } from '../../common/constants/regex';
import { RedisBaseEntity } from '../../common/entities/redis-base.entity';
import { ChatTypeEnum } from '../enums/chat-type.enum';
import { getNowUnix } from '../utils/get-now-unix.util';

@ObjectType('Chat')
export class ChatEntity extends RedisBaseEntity {
  @Field(() => String)
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public name: string;

  @Field(() => String)
  @IsString()
  @Length(3, 109)
  @Matches(SLUG_REGEX)
  public slug: string;

  @Field(() => ChatTypeEnum)
  @IsEnum(ChatTypeEnum)
  public chatType: ChatTypeEnum;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsUUID('4')
  public invitation: string;

  @IsString()
  @IsUUID()
  public userId: string;

  @IsString()
  @IsBase64()
  public chatKey: string;

  public endOfLife(): number {
    return Math.floor((this.createdAt.getTime() + 86400000) / 1000);
  }

  public expiration(): number {
    return this.endOfLife() - getNowUnix();
  }
}

export const chatSchema = new Schema(ChatEntity, {
  name: { type: 'string' },
  slug: { type: 'string' },
  invitation: { type: 'string' },
  userId: { type: 'string' },
  chatKey: { type: 'string' },
  chatType: { type: 'string' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
});
