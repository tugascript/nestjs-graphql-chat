import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { ChatDto } from '../dtos/chat.dto';

@InputType('UpdateNicknameInput')
export abstract class UpdateNicknameInput extends ChatDto {
  @Field(() => String)
  @IsString()
  @Matches(NAME_REGEX)
  @Length(3, 100)
  public nickname: string;
}
