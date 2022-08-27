import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { ULID_REGEX } from '../../common/constants/regex';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@ArgsType()
export abstract class FilterMessagesDto extends PaginationDto {
  @Field(() => String)
  @IsString()
  @Matches(ULID_REGEX)
  @Length(26, 26)
  public chatId: string;
}
