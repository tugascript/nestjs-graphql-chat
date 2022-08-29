import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { ULID_REGEX } from '../../common/constants/regex';

@ArgsType()
export abstract class InviteDto {
  @Field(() => String)
  @IsString()
  @Matches(ULID_REGEX)
  @Length(26, 26)
  public inviteId: string;
}
