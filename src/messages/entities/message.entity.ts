import { Field, ObjectType } from '@nestjs/graphql';
import { IsString, IsUUID, Length, Matches } from 'class-validator';
import { Schema } from 'redis-om';
import { ULID_REGEX } from '../../common/constants/regex';
import { RedisBaseEntity } from '../../common/entities/redis-base.entity';

@ObjectType()
export class MessageEntity extends RedisBaseEntity {
  @Field(() => String)
  @IsString()
  @Length(1, 250)
  public body: number;

  @IsString()
  @IsUUID()
  public userId: string;

  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public chatId: string;
}

export const messageSchema = new Schema(MessageEntity, {
  body: { type: 'string' },
  userId: { type: 'string' },
  chatId: { type: 'string' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
});
