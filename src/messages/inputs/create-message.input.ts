import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';
import { ChatDto } from '../../chats/dtos/chat.dto';

@InputType('CreateMessageInput')
export class CreateMessageInput extends ChatDto {
  @Field(() => String)
  @IsString()
  @Length(1, 300)
  public body: string;
}
