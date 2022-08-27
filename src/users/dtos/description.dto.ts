import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@ArgsType()
export abstract class DescriptionDto {
  @Field(() => String)
  @IsString()
  @Length(1, 500)
  public description?: string;
}
