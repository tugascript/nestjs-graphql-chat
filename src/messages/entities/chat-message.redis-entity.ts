import { Field, ObjectType } from '@nestjs/graphql';
import { IsMongoId, IsString, Length, Matches } from 'class-validator';
import { Schema } from 'redis-om';
import { ENCRYPTED_REGEX, ULID_REGEX } from '../../common/constants/regex';
import { BaseRedisEntity } from '../../common/entities/base.redis-entity';

@ObjectType('ChatMessage')
export class ChatMessageRedisEntity extends BaseRedisEntity {
  @Field(() => String)
  @IsString()
  @Matches(ENCRYPTED_REGEX)
  public body: string;

  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public profileId: string;

  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public chatId: string;

  @IsString()
  @IsMongoId()
  public userId: string;
}

export const chatMessageSchema = new Schema(ChatMessageRedisEntity, {
  body: { type: 'string' },
  time: { type: 'number' },
  profileId: { type: 'string' },
  userId: { type: 'string' },
  chatId: { type: 'string' },
  createdAt: { type: 'date', sortable: true },
  updatedAt: { type: 'date' },
});
