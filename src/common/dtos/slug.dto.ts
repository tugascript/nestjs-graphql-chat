import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { SLUG_REGEX } from '../constants/regex';

@ArgsType()
export abstract class SlugDto {
  @Field(() => String)
  @IsString()
  @Matches(SLUG_REGEX)
  @Length(3, 109)
  public slug: string;
}
