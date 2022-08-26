import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { SLUG_REGEX } from '../../common/constants/regex';
import { ChatDto } from './chat.dto';

@ArgsType()
export abstract class ProfileSlugDto extends ChatDto {
  @Field(() => String)
  @IsString()
  @Matches(SLUG_REGEX)
  @Length(3, 109)
  public slug: string;
}
