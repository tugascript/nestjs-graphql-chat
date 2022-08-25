import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { ChatTypeEnum } from '../enums/chat-type.enum';

@InputType('UpdateChatInput')
export abstract class UpdateChatInput {
  @Field(() => String)
  @IsString()
  @IsUUID()
  public chatId: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX, {
    message: 'Name must contain only letters, spaces, dots and slashes.',
  })
  @IsOptional()
  public name?: string;

  @Field(() => ChatTypeEnum, { nullable: true })
  @IsEnum(ChatTypeEnum)
  @IsOptional()
  public chatType?: ChatTypeEnum;
}
