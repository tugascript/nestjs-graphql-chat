import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { ProfileDto } from '../dtos/profile.dto';

@InputType('UpdateProfileNicknameInput')
export abstract class UpdateProfileNicknameInput extends ProfileDto {
  @Field(() => String)
  @IsString()
  @Matches(NAME_REGEX)
  @Length(3, 100)
  public nickname: string;
}
