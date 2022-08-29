import { Field, ObjectType } from '@nestjs/graphql';
import {
  IsEnum,
  IsMongoId,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { Schema } from 'redis-om';
import {
  ENCRYPTED_REGEX,
  NAME_REGEX,
  SLUG_REGEX,
} from '../../common/constants/regex';
import { BaseRedisEntity } from '../../common/entities/base.redis-entity';
import { ChatTypeEnum } from '../enums/chat-type.enum';

@ObjectType('Chat')
export class ChatRedisEntity extends BaseRedisEntity {
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

  @Field(() => String)
  @IsString()
  @IsUUID('4')
  public invitation: string;

  @IsString()
  @IsMongoId()
  public userId: string;

  @IsString()
  @Matches(ENCRYPTED_REGEX)
  public chatKey: string;
}

export const chatSchema = new Schema(ChatRedisEntity, {
  name: { type: 'string' },
  slug: { type: 'string' },
  time: { type: 'number' },
  invitation: { type: 'string' },
  userId: { type: 'string' },
  chatKey: { type: 'string' },
  chatType: { type: 'string' },
  createdAt: { type: 'date', sortable: true },
  updatedAt: { type: 'date' },
});
