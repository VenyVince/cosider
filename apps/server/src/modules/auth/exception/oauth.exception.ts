import { HttpException, HttpStatus } from '@nestjs/common';

export class OAuthException extends HttpException {
  constructor(response: string | object, status: number) {
    super(response, status);
  }
}

export class UnsupportedProviderException extends OAuthException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'UNSUPPORTED_PROVIDER',
        message: 'ERR_UNSUPPORTED_PROVIDER',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class CsrfAttackDetectedException extends OAuthException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: 'CSRF_ATTACK_DETECTED',
        message: 'ERR_CSRF_ATTACK_DETECTED',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class RequireSocialLinkingException extends OAuthException {
  constructor(userId: string, providers: string[]) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'REQUIRE_SOCIAL_LINKING',
        message: 'ERR_REQUIRE_SOCIAL_LINKING',
        meta: {
          userId,
          providers,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class OAuthSignupPendingException extends OAuthException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'REGISTRATION_PENDING',
        message: 'ERR_REGISTRATION_PENDING',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OAuthEmailRequiredException extends OAuthException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'EMAIL_REQUIRED',
        message: 'ERR_EMAIL_REQUIRED',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
