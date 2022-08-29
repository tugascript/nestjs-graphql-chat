import { Field, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsMongoId, IsString, IsUUID } from 'class-validator';
import { Schema } from 'redis-om';
import { BaseRedisEntity } from '../../common/entities/base.redis-entity';
import { InviteStatusEnum } from '../enums/invite-status.enum';

@ObjectType('Invite')
export class InviteRedisEntity extends BaseRedisEntity {
  @Field(() => InviteStatusEnum)
  @IsEnum(InviteStatusEnum)
  public status: InviteStatusEnum = InviteStatusEnum.PENDING;

  @Field(() => String)
  @IsString()
  @IsUUID('4')
  public invitation: string;

  @IsString()
  @IsMongoId()
  public recipientId: string;

  @IsString()
  @IsMongoId()
  public senderId: string;
}

export const inviteSchema = new Schema(InviteRedisEntity, {
  status: { type: 'string' },
  time: { type: 'number' },
  invitation: { type: 'string' },
  recipientId: { type: 'string' },
  senderId: { type: 'string' },
  createdAt: { type: 'date', sortable: true },
  updatedAt: { type: 'date' },
});
