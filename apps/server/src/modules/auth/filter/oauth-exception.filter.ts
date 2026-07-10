import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

interface OAuthErrorResponse {
  errorCode?: string;
  meta?: {
    providers?: string[];
  };
}

@Catch()
@Injectable()
export class OAuthExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    let errorCode = 'AUTH_FAILED';
    let providers = '';

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();
      const status = exception.getStatus();

      if (status === 409) {
        errorCode = 'CONFLICT';
      }

      if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as OAuthErrorResponse;
        errorCode = body.errorCode || errorCode;

        const metaProviders = body.meta?.providers;
        if (Array.isArray(metaProviders)) {
          providers = metaProviders.join(',');
        }
      } else if (typeof responseBody === 'string') {
        errorCode = responseBody;
      }
    }

    const redirectUrl = new URL(`${frontendUrl}/login`);
    redirectUrl.searchParams.set('error', errorCode);
    if (providers) {
      redirectUrl.searchParams.set('providers', providers);
    }

    response.redirect(redirectUrl.toString());
  }
}
