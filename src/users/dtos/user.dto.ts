import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, IsUUID } from 'class-validator';

@ArgsType()
export abstract class UserDto {
  @Field(() => String)
  @IsString()
  @IsUUID()
  public userId: string;
}
