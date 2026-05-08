import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActorContext } from './actor.context';
import { ActorInterceptor } from './actor.interceptor';
import { AuditSubscriber } from './audit.subscriber';

@Global()
@Module({
  providers: [
    ActorContext,
    AuditSubscriber,
    { provide: APP_INTERCEPTOR, useClass: ActorInterceptor },
  ],
  exports: [ActorContext],
})
export class AuditModule {}
