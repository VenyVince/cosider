import { EUserCredentialProvider } from '@cosider/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { OAuthEmailRequiredException } from '../exception/oauth.exception';

import type { OAuthUserPayload } from '@/types/auth';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthUserPayload {
    const { id, emails } = profile;

    if (!emails || emails.length === 0) {
      throw new OAuthEmailRequiredException();
    }

    const verifiedEmail = emails.find((e) => e.verified === true);

    if (!verifiedEmail || !verifiedEmail.value) {
      throw new OAuthEmailRequiredException();
    }

    return {
      email: verifiedEmail.value,
      provider: EUserCredentialProvider.GOOGLE,
      providerId: id,
    };
  }
}
