import { registerEnumType } from '@nestjs/graphql';

export enum ChatTypeEnum {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

registerEnumType(ChatTypeEnum, {
  name: 'ChatType',
});
