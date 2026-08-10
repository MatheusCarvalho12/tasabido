import fonoaudiologa from '@/assets/avatares-prof/fonoaudiologa.png'
import neuropediatra from '@/assets/avatares-prof/neuropediatra.png'
import outroProf from '@/assets/avatares-prof/outro-prof.png'
import pediatra from '@/assets/avatares-prof/pediatra.png'
import psicologa from '@/assets/avatares-prof/psicologa.png'
import psicopedagoga from '@/assets/avatares-prof/psicopedagoga.png'
import psiquiatra from '@/assets/avatares-prof/psiquiatra.png'
import terapeuta from '@/assets/avatares-prof/terapeuta.png'
import type { ProfissaoOption } from '@/types/cadastro-profissional'

/** As oito profissões do cadastro profissional, na ordem do grid (mockup aprovado). */
export const PROFISSOES: ProfissaoOption[] = [
  { id: 'psicologo', label: 'Psicólogo(a)', avatar: psicologa },
  { id: 'psiquiatra', label: 'Psiquiatra', avatar: psiquiatra },
  { id: 'terapeuta_ocupacional', label: 'Terapeuta ocupacional', avatar: terapeuta },
  { id: 'fonoaudiologo', label: 'Fonoaudiólogo(a)', avatar: fonoaudiologa },
  { id: 'pediatra', label: 'Pediatra', avatar: pediatra },
  { id: 'neuropediatra', label: 'Neuropediatra', avatar: neuropediatra },
  { id: 'psicopedagogo', label: 'Psicopedagogo(a)', avatar: psicopedagoga },
  { id: 'outro', label: 'Outro profissional', avatar: outroProf },
]
