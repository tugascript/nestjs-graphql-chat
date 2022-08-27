import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { ChatTypeEnum } from '../enums/chat-type.enum';

@InputType('CreateChatInput')
export abstract class CreateChatInput {
  @Field(() => String)
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX, {
    message: 'Name must contain only letters, spaces, dots and slashes.',
  })
  public name: string;

  @Field(() => ChatTypeEnum)
  @IsEnum(ChatTypeEnum)
  public chatType: ChatTypeEnum;

  @Field(() => Int)
  @IsInt()
  @Min(5)
  @Max(1440)
  public time: number;
}
