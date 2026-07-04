import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { AgentsModule } from './modules/agents/agents.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AuditModule } from './modules/audit/audit.module';
import { RemoteConnectionModule } from './modules/remote-connection/remote-connection.module';
import { RolesModule } from './modules/roles/roles.module';
import { WsGateway } from './ws.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AgentsModule,
    TasksModule,
    MessagesModule,
    AuditModule,
    RemoteConnectionModule,
    RolesModule,
  ],
  providers: [PrismaService, WsGateway],
})
export class AppModule {}
