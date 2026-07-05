import { EUserCredentialProvider } from '@cosider/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';

import type { OAuthUserPayload } from '@/types/auth';

@Injectable()
export class GithubOAuthStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthUserPayload {
    const { id, emails } = profile;
    const email = emails && emails[0] ? emails[0].value : '';

    return {
      email,
      provider: EUserCredentialProvider.GITHUB,
      providerId: id,
    };
  }
}
