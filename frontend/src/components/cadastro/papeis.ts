import mamae from '@/assets/avatares/mamae.png'
import outroFamiliar from '@/assets/avatares/outro-familiar.png'
import papai from '@/assets/avatares/papai.png'
import responsavel from '@/assets/avatares/responsavel.png'
import vovo from '@/assets/avatares/vovo.png'
import vovoM from '@/assets/avatares/vovo-m.png'
import type { PapelFamiliarOption } from '@/types/cadastro'

/** Os seis papéis do cadastro familiar, na ordem do grid (mockup aprovado). */
export const PAPEIS_FAMILIARES: PapelFamiliarOption[] = [
  { id: 'mamae', label: 'Mamãe', avatar: mamae },
  { id: 'papai', label: 'Papai', avatar: papai },
  { id: 'vovo', label: 'Vovó', avatar: vovo },
  { id: 'vovo-m', label: 'Vovô', avatar: vovoM },
  { id: 'responsavel', label: 'Responsável', avatar: responsavel },
  { id: 'outro-familiar', label: 'Outro familiar', avatar: outroFamiliar },
]
