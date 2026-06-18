import { ConsoleLogger, Injectable } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

@Injectable()
export class OtelLogger extends ConsoleLogger {
  private get otelLogger() {
    return logs.getLogger('nexa-api-logger');
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.emitOtelLog(SeverityNumber.INFO, message, context);
  }

  error(message: any, stackOrContext?: string, context?: string) {
    super.error(message, stackOrContext, context);
    const resolvedContext = context || stackOrContext;
    const resolvedStack = context ? stackOrContext : undefined;
    this.emitOtelLog(SeverityNumber.ERROR, message, resolvedContext, {
      stack: resolvedStack,
    });
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.emitOtelLog(SeverityNumber.WARN, message, context);
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    this.emitOtelLog(SeverityNumber.DEBUG, message, context);
  }

  verbose(message: any, context?: string) {
    super.verbose(message, context);
    this.emitOtelLog(SeverityNumber.TRACE, message, context);
  }

  private emitOtelLog(
    severityNumber: SeverityNumber,
    message: any,
    context?: string,
    attributes?: Record<string, any>,
  ) {
    try {
      this.otelLogger.emit({
        severityNumber,
        severityText: SeverityNumber[severityNumber],
        body: typeof message === 'string' ? message : JSON.stringify(message),
        attributes: {
          'log.context': context || this.context || 'UnknownContext',
          ...attributes,
        },
      });
    } catch (_e) {
      // Ignore if OTel is not initialized yet
    }
  }
}
