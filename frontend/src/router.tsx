import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { getToken } from '@/lib/auth'
import { CadastroPage } from '@/pages/CadastroPage'
import { CadastroSobrePage } from '@/pages/CadastroSobrePage'
import { ForgotPasswordStubPage } from '@/pages/ForgotPasswordStubPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { ProfessionalLoginPage } from '@/pages/ProfessionalLoginPage'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (getToken()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

const professionalLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login/profissional',
  beforeLoad: () => {
    if (getToken()) {
      throw redirect({ to: '/' })
    }
  },
  component: ProfessionalLoginPage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: HomePage,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  component: CadastroPage,
})

const signupSobreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/sobre',
  component: CadastroSobrePage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/esqueci-senha',
  component: ForgotPasswordStubPage,
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  professionalLoginRoute,
  signupRoute,
  signupSobreRoute,
  forgotPasswordRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
