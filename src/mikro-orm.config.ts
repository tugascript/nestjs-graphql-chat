import { Options } from '@mikro-orm/core';

const config: Options = {
  type: 'mongo',
  clientUrl: process.env.DATABASE_URL,
  entities: ['dist/**/*.entity.js', 'dist/**/*.embeddable.js'],
  entitiesTs: ['src/**/*.entity.ts', 'src/**/*.embeddable.ts'],
  allowGlobalContext: true,
};

export default config;
