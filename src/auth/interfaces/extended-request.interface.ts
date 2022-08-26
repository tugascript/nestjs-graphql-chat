import { FastifyRequest } from 'fastify';

export interface IExtendedRequest extends FastifyRequest {
  user?: string;
}
