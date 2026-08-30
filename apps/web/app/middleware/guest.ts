export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated, user, getPostSignInPath } = useAuth();

  if (isAuthenticated.value) {
    return navigateTo(getPostSignInPath(user.value));
  }
});
