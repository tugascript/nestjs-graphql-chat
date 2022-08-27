import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';
import { ChatMessageDto } from '../dtos/chat-message.dto';

@InputType('UpdateMessageInput')
export class UpdateMessageInput extends ChatMessageDto {
  @Field(() => String)
  @IsString()
  @Length(1, 300)
  public body: string;
}
