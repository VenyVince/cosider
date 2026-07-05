import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

@Injectable()
export class OAuthGuard implements CanActivate {
  private readonly frontendUrl: string;
  private readonly guardMap: Record<string, CanActivate>;

  constructor(configService: ConfigService) {
    this.frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
    this.guardMap = {
      google: new (AuthGuard('google'))(),
      github: new (AuthGuard('github'))(),
    };
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const provider = request.params.provider;

    if (typeof provider !== 'string') {
      response.redirect(`${this.frontendUrl}/login?error=UNSUPPORTED_PROVIDER`);
      return false;
    }

    const targetGuard = this.guardMap[provider];

    if (!targetGuard) {
      response.redirect(`${this.frontendUrl}/login?error=UNSUPPORTED_PROVIDER`);
      return false;
    }

    return targetGuard.canActivate(context);
  }
}
