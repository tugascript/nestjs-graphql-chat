import { ICtx } from '../../config/interfaces/ctx.interface';

export const contextToUser = (ctx: ICtx): string => {
  return (ctx.req as any)?.user ?? ctx?.extra.user.userId;
};
