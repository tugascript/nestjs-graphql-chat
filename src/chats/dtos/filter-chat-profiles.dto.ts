import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { FilterRelationDto } from '../../common/dtos/filter-relation.dto';

@ArgsType()
export abstract class FilterChatProfilesDto extends FilterRelationDto {
  @Field(() => String, { nullable: true })
  @IsString()
  @Matches(NAME_REGEX)
  @Length(3, 100)
  public nickname?: string;
}
