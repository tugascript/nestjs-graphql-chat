import { registerEnumType } from '@nestjs/graphql';

export enum InviteStatusEnum {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

registerEnumType(InviteStatusEnum, {
  name: 'InviteStatus',
});
