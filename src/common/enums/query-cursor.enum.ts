import { registerEnumType } from '@nestjs/graphql';
import { UserEntity } from '../../users/entities/user.entity';

export enum QueryCursorEnum {
  DATE = 'DATE',
  ALPHA = 'ALPHA',
}

registerEnumType(QueryCursorEnum, {
  name: 'QueryCursor',
});

export const getQueryCursor = (cursor: QueryCursorEnum): string =>
  cursor === QueryCursorEnum.DATE ? 'createdAt' : 'slug';

export const getUserQueryCursor = (cursor: QueryCursorEnum): keyof UserEntity =>
  cursor === QueryCursorEnum.DATE ? 'createdAt' : 'username';
