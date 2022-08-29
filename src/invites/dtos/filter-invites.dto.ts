import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { InviteStatusEnum } from '../enums/invite-status.enum';

@ArgsType()
export abstract class FilterInvitesDto extends PaginationDto {
  @Field(() => InviteStatusEnum, { nullable: true })
  @IsEnum(InviteStatusEnum)
  @IsOptional()
  public status?: InviteStatusEnum;
}
