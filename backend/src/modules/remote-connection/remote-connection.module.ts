import { Module } from '@nestjs/common';
import { RemoteConnectionController } from './remote-connection.controller';
import { RemoteConnectionService } from './remote-connection.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RemoteConnectionController],
  providers: [RemoteConnectionService],
  exports: [RemoteConnectionService],
})
export class RemoteConnectionModule {}
