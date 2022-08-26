import { QueryCursorEnum } from './query-cursor.enum';

export enum AfterCursorEnum {
  DATE = 'DATE',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
}

export const getAfterCursor = (cursor: QueryCursorEnum) =>
  QueryCursorEnum.DATE ? AfterCursorEnum.DATE : AfterCursorEnum.STRING;
