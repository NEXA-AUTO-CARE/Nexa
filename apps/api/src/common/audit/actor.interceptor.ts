import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ActorContext } from './actor.context';

/**
 * Runs after auth guards, so `req.user` is populated for protected routes.
 * Pushes the current principal into ActorContext so the AuditSubscriber can
 * stamp createdBy/updatedBy on entities saved during this request.
 */
@Injectable()
export class ActorInterceptor implements NestInterceptor {
  constructor(private readonly actor: ActorContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req?.user as AuthenticatedUser | undefined;
    this.actor.enter({ userId: user?.userId ?? null });
    return next.handle();
  }
}
