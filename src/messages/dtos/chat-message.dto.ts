import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { ChatDto } from '../../chats/dtos/chat.dto';
import { ULID_REGEX } from '../../common/constants/regex';

@InputType({ isAbstract: true })
@ArgsType()
export abstract class ChatMessageDto extends ChatDto {
  @Field(() => String)
  @IsString()
  @Length(26, 26)
  @Matches(ULID_REGEX)
  public messageId: string;
}
