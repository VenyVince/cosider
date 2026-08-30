import type { IAuthorizeDto, IAuthUserResponse } from '@cosider/shared';

import type { OAuthProvider } from '~/constants/auth.const';

function getPostSignInPath(profile: IAuthUserResponse | null) {
  // TODO: 대시보드 구현
  return profile ? '/dashboard' : '/settings/profile/create';
}

export function useAuth() {
  const user = useState<IAuthUserResponse | null>('authenticated-user', () => null);
  const hasSession = useState<boolean>('has-auth-session', () => false);
  const isAuthenticated = computed(() => hasSession.value);

  const config = useRuntimeConfig();
  const { $api } = useNuxtApp();

  async function fetchUser(): Promise<IAuthUserResponse | null> {
    try {
      const data = await $api<IAuthUserResponse>(`/api/v1/users/me`);
      hasSession.value = true;
      user.value = data;
      return user.value;
    } catch (error: unknown) {
      const status = (error as { statusCode?: number })?.statusCode;

      if (status === 404) {
        hasSession.value = true;
        user.value = null;
        return null;
      }

      clearAuth();
      return null;
    }
  }

  async function signInWithLocal(credential: IAuthorizeDto) {
    await $api(`/api/v1/auth/sign-in`, {
      method: 'POST',
      body: credential,
    });
    const userData = await fetchUser();

    // 로그인 시에는 설정페이지가 아니라, 대시보드 페이지로 이동합니다.
    await navigateTo(getPostSignInPath(userData));
  }

  async function signInWithOAuth(provider: OAuthProvider) {
    window.location.href = `${config.public.apiBase}/api/v1/auth/oauth/${provider}`;
  }

  function clearAuth() {
    hasSession.value = false;
    user.value = null;
  }

  async function signOut() {
    await $api(`/api/v1/auth/sign-out`, {
      method: 'POST',
    });
    clearAuth();
  }

  return {
    user,
    hasSession,
    isAuthenticated,
    fetchUser,
    getPostSignInPath,
    signInWithLocal,
    signInWithOAuth,
    signOut,
    clearAuth,
  };
}
