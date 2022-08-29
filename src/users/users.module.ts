import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';
import { InvitesModule } from '../invites/invites.module';
import { MessagesModule } from '../messages/messages.module';
import { UserEntity } from './entities/user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([UserEntity]),
    forwardRef(() => ChatsModule),
    MessagesModule,
    forwardRef(() => InvitesModule),
  ],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
