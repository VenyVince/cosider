import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

interface PassportAuthGuard {
  type: string;
}

@Injectable()
export class OAuthGuard extends AuthGuard('google') {
  private readonly frontendUrl: string;

  constructor(configService: ConfigService) {
    super();
    this.frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const provider = request.params.provider;

    if (provider !== 'google' && provider !== 'github') {
      response.redirect(`${this.frontendUrl}/login?error=UNSUPPORTED_PROVIDER`);
      return false;
    }

    const guard = this as unknown as PassportAuthGuard;
    const originalType = guard.type;
    guard.type = provider;

    try {
      return super.canActivate(context);
    } finally {
      guard.type = originalType;
    }
  }
}
