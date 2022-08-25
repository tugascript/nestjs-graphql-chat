import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsString, Length, Matches } from 'class-validator';
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
}
