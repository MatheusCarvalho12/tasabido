import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { PinScreen } from '@/components/jogos/PinScreen'
import { getStoredUser, getToken } from '@/lib/auth'
import { CadastroFamiliaPage } from '@/pages/CadastroFamiliaPage'
import { CadastroFinalizarPage } from '@/pages/CadastroFinalizarPage'
import { CadastroPage } from '@/pages/CadastroPage'
import { CadastroProfissionalAtuacaoPage } from '@/pages/CadastroProfissionalAtuacaoPage'
import { CadastroProfissionalFinalizarPage } from '@/pages/CadastroProfissionalFinalizarPage'
import { CadastroProfissionalPage } from '@/pages/CadastroProfissionalPage'
import { CadastroProfissionalSobrePage } from '@/pages/CadastroProfissionalSobrePage'
import { CadastroSobrePage } from '@/pages/CadastroSobrePage'
import { ForgotPasswordStubPage } from '@/pages/ForgotPasswordStubPage'
import { HomePage } from '@/pages/HomePage'
import { JogoEmConstrucaoPage } from '@/pages/JogoEmConstrucaoPage'
import { JogosPage } from '@/pages/JogosPage'
import { LoginPage } from '@/pages/LoginPage'
import { ParentsAreaPage } from '@/pages/ParentsAreaPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { ProfessionalLoginPage } from '@/pages/ProfessionalLoginPage'
import { useParentPinStore } from '@/stores/useParentPinStore'

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
    // Home pós-login da família = tela de jogos (modo criança).
    if (getStoredUser()?.role === 'family') {
      throw redirect({ to: '/jogos' })
    }
  },
  component: HomePage,
})

const jogosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/jogos',
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
    // A tela de jogos é do modo criança; profissional segue na home antiga.
    if (getStoredUser()?.role === 'professional') {
      throw redirect({ to: '/' })
    }
  },
  component: JogosPage,
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

const signupFamiliaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/familia',
  component: CadastroFamiliaPage,
})

const signupFinalizarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/finalizar',
  component: CadastroFinalizarPage,
})

const signupProfissionalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/profissional',
  component: CadastroProfissionalPage,
})

const signupProfissionalSobreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/profissional/sobre',
  component: CadastroProfissionalSobrePage,
})

const signupProfissionalAtuacaoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/profissional/atuacao',
  component: CadastroProfissionalAtuacaoPage,
})

const signupProfissionalFinalizarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/profissional/finalizar',
  component: CadastroProfissionalFinalizarPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/esqueci-senha',
  component: ForgotPasswordStubPage,
})

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacidade',
  component: PrivacyPage,
})

const jogarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/jogar/$slug',
  component: JogoEmConstrucaoPage,
})

const pinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pin',
  component: PinScreen,
})

const parentsAreaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pais',
  beforeLoad: () => {
    // Área dos pais só abre com PIN validado (store). Sem desbloqueio → modo criança.
    if (!useParentPinStore.getState().unlocked) {
      throw redirect({ to: '/' })
    }
  },
  component: ParentsAreaPage,
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  professionalLoginRoute,
  signupRoute,
  signupSobreRoute,
  signupFamiliaRoute,
  signupFinalizarRoute,
  signupProfissionalRoute,
  signupProfissionalSobreRoute,
  signupProfissionalAtuacaoRoute,
  signupProfissionalFinalizarRoute,
  forgotPasswordRoute,
  privacyRoute,
  jogarRoute,
  jogosRoute,
  pinRoute,
  parentsAreaRoute,
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
