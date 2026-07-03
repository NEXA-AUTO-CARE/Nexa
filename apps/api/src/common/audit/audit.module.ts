import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorContext } from './actor.context';
import { ActorInterceptor } from './actor.interceptor';
import { AuditSubscriber } from './audit.subscriber';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrail } from '../../database/entities/audit-trail.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditTrail])],
  providers: [
    ActorContext,
    AuditSubscriber,
    AuditTrailService,
    { provide: APP_INTERCEPTOR, useClass: ActorInterceptor },
  ],
  exports: [ActorContext, AuditTrailService],
})
export class AuditModule {}
