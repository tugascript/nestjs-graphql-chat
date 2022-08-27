import { Request, Response } from 'express';
import { IExtra } from './extra.interface';

export interface ICtx {
  req: Request;
  res: Response;
  extra?: IExtra;
}
