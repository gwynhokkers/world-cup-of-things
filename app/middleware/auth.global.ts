export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const isProtected =
    to.path === '/create' ||
    (to.path.startsWith('/c/') && to.path.endsWith('/edit'))
  if (isProtected && !loggedIn.value) {
    return navigateTo('/')
  }
})
