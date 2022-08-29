import { Field, InputType } from '@nestjs/graphql';
import { IsMongoId, IsString, IsUUID } from 'class-validator';

@InputType('CreateInviteInput')
export class CreateInviteInput {
  @Field(() => String)
  @IsString()
  @IsMongoId()
  public recipientId: string;

  @Field(() => String)
  @IsString()
  @IsUUID()
  public invitation: string;
}
