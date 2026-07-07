import { randomBytes } from 'crypto';

import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

interface IAuthGuardWithOptions extends CanActivate {
  getAuthenticateOptions?: (context: ExecutionContext) => Record<string, unknown>;
}

const providerGuards: Record<string, CanActivate> = {
  google: new (AuthGuard('google'))(),
  github: new (AuthGuard('github'))(),
};

@Injectable()
export class OAuthGuard implements CanActivate {
  private readonly frontendUrl: string;
  private readonly isProduction: boolean;

  constructor(configService: ConfigService) {
    this.frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
    this.isProduction = configService.get<string>('NODE_ENV') === 'production';
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const provider = request.params.provider;

    if (typeof provider !== 'string') {
      response.redirect(`${this.frontendUrl}/login?error=UNSUPPORTED_PROVIDER`);
      return true; // 이중 응답 방지
    }

    const targetGuard = providerGuards[provider];

    if (!targetGuard) {
      response.redirect(`${this.frontendUrl}/login?error=UNSUPPORTED_PROVIDER`);
      return true; // 이중 응답 방지
    }

    const path = request.path;
    const isCallback = path.endsWith('/callback');

    if (isCallback) {
      // 1. 콜백 경로인 경우: CSRF State 검증
      const stateQuery = typeof request.query.state === 'string' ? request.query.state : undefined;
      const stateCookie =
        typeof request.cookies?.oauth_state === 'string' ? request.cookies.oauth_state : undefined;

      // 검증 여부와 상관없이 일회성이므로 즉시 쿠키 삭제
      response.clearCookie('oauth_state', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });

      if (!stateCookie || !stateQuery || stateCookie !== stateQuery) {
        throw new UnauthorizedException({
          statusCode: HttpStatus.UNAUTHORIZED,
          errorCode: 'CSRF_ATTACK_DETECTED',
          message: 'ERR_CSRF_ATTACK_DETECTED',
        });
      }
    } else {
      // 2. 인증 시작 경로인 경우: CSRF State 생성 및 주입
      const state = randomBytes(16).toString('hex');

      // HttpOnly 쿠키에 저장
      response.cookie('oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.isProduction,
        maxAge: 300000, // 5분
        path: '/',
      });

      // targetGuard의 getAuthenticateOptions를 몽키 패치하여 state 주입
      const guardWithOptions = targetGuard as IAuthGuardWithOptions;
      guardWithOptions.getAuthenticateOptions = () => ({ state });
    }

    return targetGuard.canActivate(context);
  }
}
