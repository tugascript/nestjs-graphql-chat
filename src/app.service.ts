import { MikroORM } from '@mikro-orm/core';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly orm: MikroORM) {}

  public async onModuleInit() {
    await this.orm.getSchemaGenerator().createSchema();
  }
}
