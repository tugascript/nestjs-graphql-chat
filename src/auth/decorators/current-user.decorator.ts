import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ICtx } from '../../config/interfaces/ctx.interface';

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext): string | undefined => {
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest()?.user;
    }

    const ctx: ICtx = GqlExecutionContext.create(context).getContext();
    return (ctx.req as any)?.user ?? ctx?.extra?.user?.userId;
  },
);
