import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { NAME_REGEX, ULID_REGEX } from '../../common/constants/regex';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@ArgsType()
export abstract class FilterProfilesDto extends PaginationDto {
  @Field(() => String)
  @IsString()
  @Matches(ULID_REGEX)
  @Length(26, 26)
  public chatId: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @Matches(NAME_REGEX)
  @Length(3, 100)
  public nickname?: string;
}
