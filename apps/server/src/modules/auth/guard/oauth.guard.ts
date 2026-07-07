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

interface CustomRequest extends Request {
  oauthState?: string;
}

// 클래스 외부에 선언하여 싱글톤으로 가드 인스턴스 유지
const providerGuards: Record<string, CanActivate> = {
  google: new (class extends AuthGuard('google') {
    // 싱글톤 상태에서 다중 동시 요청 간 state가 Race Condition을 막기 위해,
    // 런타임에 메서드를 몽키 패칭하지 않고 Request로부터 state를 동적으로 추출.
    override getAuthenticateOptions(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest<CustomRequest>();
      return { state: request.oauthState };
    }
  })(),
  github: new (class extends AuthGuard('github') {
    override getAuthenticateOptions(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest<CustomRequest>();
      return { state: request.oauthState };
    }
  })(),
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
    const request = http.getRequest<CustomRequest>();
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

      // request 객체에 안전하게 state 기록 (싱글톤 간 간섭 방지)
      request.oauthState = state;
    }

    return targetGuard.canActivate(context);
  }
}
