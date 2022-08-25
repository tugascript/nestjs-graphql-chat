import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, IsUUID } from 'class-validator';

@ArgsType()
export abstract class ChatDto {
  @Field(() => String)
  @IsString()
  @IsUUID()
  public chatId: string;
}
