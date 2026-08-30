export default defineNuxtPlugin({
  name: 'auth-init',
  enforce: 'post',
  async setup() {
    const { fetchUser } = useAuth();
    await fetchUser();
  },
});
