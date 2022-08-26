import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, IsUUID } from 'class-validator';

@ArgsType()
export abstract class InvitationDto {
  @Field(() => String)
  @IsString()
  @IsUUID('4')
  public invitation: string;
}
