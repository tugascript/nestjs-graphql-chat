import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { ULID_REGEX } from '../../common/constants/regex';
import { ChatDto } from './chat.dto';

@InputType({ isAbstract: true })
@ArgsType()
export abstract class ProfileDto extends ChatDto {
  @Field(() => String)
  @IsString()
  @Matches(ULID_REGEX)
  @Length(26, 26)
  public profileId: string;
}
