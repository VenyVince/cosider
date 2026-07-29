import { EJobRole, EUserCredentialProvider, EUserStatus } from '@cosider/shared';

export interface GeneratedAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthenticatedUser {
  userId: string;
  status: EUserStatus;
  twoFactorEnabled: boolean;
  email: string;
  handle: string;
  nickname: string | null;
  jobRole: EJobRole;
}

export interface ExistingProviderInfo {
  provider: EUserCredentialProvider;
  providerId: string;
}

export interface ExistingProviders {
  userId: string;
  status: EUserStatus;
  providers: ExistingProviderInfo[];
}

export type OAuthUserPayload = {
  email: string;
  provider: EUserCredentialProvider;
  providerId: string;
};
