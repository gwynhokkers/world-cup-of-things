export default defineNuxtPlugin({
  name: 'authorization-resolver',
  parallel: true,
  setup() {
    return {
      provide: {
        authorization: {
          resolveClientUser: () => {
            const session = useUserSession()
            return session.user?.value ?? session.user ?? null
          }
        }
      }
    }
  }
})
