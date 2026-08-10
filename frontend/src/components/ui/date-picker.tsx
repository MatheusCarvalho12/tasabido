'use client'

import { Popover } from '@base-ui/react/popover'
import { Select } from '@base-ui/react/select'
import {
  ArrowRight,
  Calendar,
  CalendarBlank,
  CalendarDots,
  CaretDown,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
import { type DayButtonProps, DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'

import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { formatBrDate, parseBrDate } from '@/lib/cadastro'
import { cn } from '@/lib/utils'

type Aba = 'dia' | 'mes' | 'ano'

/** Meses por extenso (pt-BR), índice 0 = janeiro. */
const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/** Rótulos dos dias da semana na ordem do mockup (domingo → sábado). */
const DIAS_SEMANA_PT = ['Dom.', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** Quantidade de anos exibidos por página na aba Ano. */
const TAMANHO_PAGINA_ANOS = 12

/** Faixa aceita pela validação de nascimento (não futura, ≤ 120 anos). */
const ANOS_ATRAS = 120

function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate()
}

interface DatePickerProps {
  id: string
  name: string
  /** Rótulo acessível + visível dentro da pill (ex.: "Data de nascimento"). */
  label: string
  /** Valor no formato dd/mm/aaaa. */
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  hasError: boolean
  error?: string
}

/** Botão de um dia no grid: número com as cores de fim de semana do mockup. */
function DiaButton({ day, modifiers, className, ...props }: DayButtonProps) {
  const diaSemana = day.date.getDay()
  const selecionado = Boolean(modifiers.selected)
  return (
    <button
      {...props}
      className={cn(
        className,
        'flex size-10 items-center justify-center rounded-full text-base font-bold transition-colors duration-150 sm:size-11',
        selecionado
          ? 'bg-blue text-white shadow-clay-btn'
          : modifiers.outside
            ? 'text-[#c8c8c8]'
            : diaSemana === 0
              ? 'text-coral hover:bg-coral/10'
              : diaSemana === 6
                ? 'text-turquoise hover:bg-turquoise/10'
                : 'text-navy hover:bg-blue/10',
      )}
    >
      {day.date.getDate()}
    </button>
  )
}

/**
 * DatePicker "Tá Sabido" (mockup aprovado): campo em pill que abre um painel
 * com abas Dia/Mês/Ano. A aba Dia usa o react-day-picker com o mês real;
 * Mês e Ano usam grades próprias com navegação rápida. Sem "Limpar" e sem
 * legenda de disponibilidade — o painel serve para data de nascimento.
 * Valor sempre em dd/mm/aaaa (contrato da store).
 */
export function DatePicker({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  hasError,
  error,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [aba, setAba] = useState<Aba>('dia')
  const [view, setView] = useState(() => {
    const hoje = new Date()
    return { mes: hoje.getMonth(), ano: hoje.getFullYear() }
  })
  const [pendingDay, setPendingDay] = useState<number | null>(null)

  /** Sincroniza o estado interno com o valor do campo ao abrir o painel. */
  const abrirPainel = () => {
    const data = parseBrDate(value)
    if (data) {
      setView({ mes: data.getMonth(), ano: data.getFullYear() })
      setPendingDay(data.getDate())
    } else {
      const hoje = new Date()
      setView({ mes: hoje.getMonth(), ano: hoje.getFullYear() })
      setPendingDay(null)
    }
    setAba('dia')
    setOpen(true)
  }

  /** Navega para um mês/ano (normaliza 0-11), mantendo o dia pendente (limitado aos dias do mês). */
  const irPara = (mes: number, ano: number) => {
    const data = new Date(ano, mes, 1)
    const mesNormal = data.getMonth()
    const anoNormal = data.getFullYear()
    setView({ mes: mesNormal, ano: anoNormal })
    setPendingDay((dia) => (dia === null ? null : Math.min(dia, diasNoMes(anoNormal, mesNormal))))
  }

  const aplicar = () => {
    if (pendingDay === null) {
      return
    }
    onChange(formatBrDate(new Date(view.ano, view.mes, pendingDay)))
    onBlur()
    setOpen(false)
  }

  // Paginação da aba Ano: a página 0 são os 12 anos MAIS RECENTES (terminando
  // no ano atual — o padrão para data de nascimento); as setas voltam no tempo.
  const anoMax = new Date().getFullYear()
  const anoMin = anoMax - ANOS_ATRAS
  const paginaAnos = Math.floor((anoMax - view.ano) / TAMANHO_PAGINA_ANOS)
  const inicioPagina = anoMax - (paginaAnos + 1) * TAMANHO_PAGINA_ANOS + 1
  const ultimaPagina = Math.floor((anoMax - anoMin) / TAMANHO_PAGINA_ANOS)
  const anosPagina = Array.from({ length: TAMANHO_PAGINA_ANOS }, (_, i) => inicioPagina + i).filter(
    (ano) => ano >= anoMin && ano <= anoMax,
  )
  const anosOpcoes = Array.from({ length: anoMax - anoMin + 1 }, (_, i) => anoMax - i)

  const mudarPaginaAnos = (delta: number) => {
    const pagina = Math.min(Math.max(paginaAnos - delta, 0), ultimaPagina)
    const inicio = anoMax - (pagina + 1) * TAMANHO_PAGINA_ANOS + 1
    irPara(view.mes, Math.min(Math.max(view.ano, inicio), inicio + TAMANHO_PAGINA_ANOS - 1, anoMax))
  }

  // Abas com navegação por setas (padrão ARIA tabs: roving tabindex).
  const tabRefs = useRef<Record<Aba, HTMLButtonElement | null>>({
    dia: null,
    mes: null,
    ano: null,
  })
  const ordemAbas: Aba[] = ['dia', 'mes', 'ano']

  const atalhosAbas = (event: KeyboardEvent<HTMLDivElement>) => {
    const atual = ordemAbas.indexOf(aba)
    let proxima = atual
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      proxima = (atual + 1) % ordemAbas.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      proxima = (atual - 1 + ordemAbas.length) % ordemAbas.length
    } else if (event.key === 'Home') {
      proxima = 0
    } else if (event.key === 'End') {
      proxima = ordemAbas.length - 1
    } else {
      return
    }
    event.preventDefault()
    setAba(ordemAbas[proxima])
    tabRefs.current[ordemAbas[proxima]]?.focus()
  }

  const abas: { id: Aba; label: string; icone: ReactNode; corInativa: string }[] = [
    { id: 'dia', label: 'Dia', icone: <CalendarBlank weight="fill" />, corInativa: 'text-blue' },
    {
      id: 'mes',
      label: 'Mês',
      icone: <CalendarDots weight="fill" />,
      corInativa: 'text-turquoise',
    },
    { id: 'ano', label: 'Ano', icone: <Calendar weight="fill" />, corInativa: 'text-yellow' },
  ]

  const rotuloSetaAnterior = aba === 'ano' ? 'Página de anos anterior' : 'Mês anterior'
  const rotuloSetaProxima = aba === 'ano' ? 'Próxima página de anos' : 'Próximo mês'

  const setaAnteriorHabilitada = aba === 'dia' || (aba === 'ano' && paginaAnos < ultimaPagina)
  const setaProximaHabilitada = aba === 'dia' || (aba === 'ano' && paginaAnos > 0)

  const dataSelecionada = pendingDay !== null ? new Date(view.ano, view.mes, pendingDay) : undefined

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <FieldContent>
        <Popover.Root
          open={open}
          onOpenChange={(proximo) => {
            if (proximo) {
              abrirPainel()
            } else {
              setOpen(false)
            }
          }}
        >
          <Popover.Trigger
            id={id}
            name={name}
            aria-haspopup="dialog"
            className="flex h-14 w-full items-center gap-3 rounded-full bg-white pl-4 pr-5 text-left shadow-clay-sm transition-shadow hover:shadow-clay-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <CalendarBlank
              weight="fill"
              aria-hidden="true"
              className="size-6 shrink-0 text-purple"
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-semibold text-navy/70">{label}</span>
              <span
                className={cn(
                  'truncate text-base font-medium',
                  value ? 'text-navy' : 'text-muted-foreground',
                )}
              >
                {value || 'dd/mm/aaaa'}
              </span>
            </span>
            <CaretDown
              weight="bold"
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner
              side="bottom"
              align="center"
              sideOffset={10}
              collisionAvoidance={{ side: 'shift', align: 'shift', fallbackAxisSide: 'start' }}
              className="z-50 w-[min(calc(100vw_-_2rem),28rem)]"
            >
              <Popover.Popup
                aria-labelledby={`${id}-titulo`}
                className="relative max-h-[calc(100dvh_-_2rem)] w-full overflow-y-auto rounded-3xl bg-white p-4 shadow-clay focus:outline-none sm:p-5"
              >
                {/* Notch que conecta o painel ao campo (mockup) */}
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[3px] bg-white"
                />
                <h2 id={`${id}-titulo`} className="sr-only">
                  Escolha a {label}
                </h2>

                <div
                  role="tablist"
                  aria-label="Escolher como navegar no calendário"
                  onKeyDown={atalhosAbas}
                  className="flex items-center justify-between gap-1.5"
                >
                  {abas.map((item, indice) => {
                    const ativa = aba === item.id
                    return (
                      <div key={item.id} className="contents">
                        {indice > 0 && (
                          <CaretRight
                            weight="bold"
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground/70"
                          />
                        )}
                        <button
                          ref={(node) => {
                            tabRefs.current[item.id] = node
                          }}
                          type="button"
                          role="tab"
                          id={`${id}-aba-${item.id}`}
                          aria-selected={ativa}
                          aria-controls={`${id}-painel-${item.id}`}
                          tabIndex={ativa ? 0 : -1}
                          onClick={() => setAba(item.id)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            ativa
                              ? 'bg-blue/10 text-blue shadow-clay-white'
                              : 'bg-white text-navy shadow-clay-white hover:bg-blue/5',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn('size-5', ativa ? 'text-blue' : item.corInativa)}
                          >
                            {item.icone}
                          </span>
                          {item.label}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Navegação: setas + dropdowns de mês e ano (pulo direto) */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={rotuloSetaAnterior}
                    disabled={!setaAnteriorHabilitada}
                    onClick={() =>
                      aba === 'ano' ? mudarPaginaAnos(-1) : irPara(view.mes - 1, view.ano)
                    }
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-blue shadow-clay-white transition-colors hover:bg-blue/10 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <CaretLeft weight="bold" aria-hidden="true" className="size-5" />
                  </button>

                  <Select.Root
                    value={String(view.mes)}
                    itemToStringLabel={(valor) => MESES_PT[Number(valor)] ?? ''}
                    onValueChange={(valor) => irPara(Number(valor), view.ano)}
                  >
                    <Select.Trigger
                      aria-label="Mês"
                      className="flex h-10 flex-1 items-center justify-between gap-1 rounded-full bg-white px-3.5 text-sm font-bold text-navy shadow-clay-white transition-shadow outline-none data-open:ring-2 data-open:ring-blue/40 focus-visible:ring-2 focus-visible:ring-blue/40"
                    >
                      <Select.Value />
                      <CaretDown
                        weight="bold"
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground"
                      />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={4} align="start" className="z-50">
                        <Select.Popup className="max-h-56 w-40 overflow-y-auto rounded-2xl bg-white p-1 shadow-clay">
                          {MESES_PT.map((nome, indice) => (
                            <Select.Item
                              key={nome}
                              value={String(indice)}
                              label={nome}
                              className="flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm font-semibold text-navy outline-none data-highlighted:bg-blue/10 data-selected:bg-blue data-selected:text-white"
                            >
                              <Select.ItemText>{nome}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>

                  <Select.Root
                    value={String(view.ano)}
                    itemToStringLabel={(valor) => String(valor)}
                    onValueChange={(valor) => irPara(view.mes, Number(valor))}
                  >
                    <Select.Trigger
                      aria-label="Ano"
                      className="flex h-10 flex-1 items-center justify-between gap-1 rounded-full bg-white px-3.5 text-sm font-bold text-navy shadow-clay-white transition-shadow outline-none data-open:ring-2 data-open:ring-blue/40 focus-visible:ring-2 focus-visible:ring-blue/40"
                    >
                      <Select.Value />
                      <CaretDown
                        weight="bold"
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground"
                      />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={4} align="start" className="z-50">
                        <Select.Popup className="max-h-56 w-28 overflow-y-auto rounded-2xl bg-white p-1 shadow-clay">
                          {anosOpcoes.map((ano) => (
                            <Select.Item
                              key={ano}
                              value={String(ano)}
                              label={String(ano)}
                              className="flex cursor-pointer items-center justify-center rounded-xl px-2 py-2 text-sm font-semibold text-navy outline-none data-highlighted:bg-blue/10 data-selected:bg-blue data-selected:text-white"
                            >
                              <Select.ItemText>{ano}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>

                  <button
                    type="button"
                    aria-label={rotuloSetaProxima}
                    disabled={!setaProximaHabilitada}
                    onClick={() =>
                      aba === 'ano' ? mudarPaginaAnos(1) : irPara(view.mes + 1, view.ano)
                    }
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-blue shadow-clay-white transition-colors hover:bg-blue/10 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <CaretRight weight="bold" aria-hidden="true" className="size-5" />
                  </button>
                </div>

                {/* Aba Dia: grade do mês real (react-day-picker) */}
                <div
                  role="tabpanel"
                  id={`${id}-painel-dia`}
                  aria-labelledby={`${id}-aba-dia`}
                  className="mt-3"
                >
                  {aba === 'dia' && (
                    <DayPicker
                      mode="single"
                      required
                      selected={dataSelecionada}
                      onSelect={(data) => setPendingDay(data ? data.getDate() : null)}
                      month={new Date(view.ano, view.mes, 1)}
                      onMonthChange={(mes) => irPara(mes.getMonth(), mes.getFullYear())}
                      onDayClick={(data, modifiers) => {
                        // Clicar num dia de outro mês navega direto para ele.
                        if (modifiers.outside) {
                          irPara(data.getMonth(), data.getFullYear())
                        }
                      }}
                      locale={ptBR}
                      weekStartsOn={0}
                      hideNavigation
                      captionLayout="label"
                      formatters={{
                        formatWeekdayName: (dia) => DIAS_SEMANA_PT[dia.getDay()],
                      }}
                      components={{ DayButton: DiaButton }}
                      classNames={{
                        root: 'w-full',
                        months: '',
                        month: 'flex flex-col gap-1',
                        month_caption: 'sr-only',
                        month_grid: 'w-full',
                        weekdays: 'flex',
                        weekday:
                          'flex flex-1 items-center justify-center pb-1.5 text-xs font-bold text-navy [&:nth-child(1)]:text-coral [&:nth-child(7)]:text-turquoise',
                        weeks: '',
                        week: 'flex',
                        day: 'flex flex-1 items-center justify-center p-0.5',
                        day_button: '',
                        outside: '',
                        selected: '',
                        today: '',
                        disabled: 'opacity-40',
                        hidden: 'invisible',
                        nav: 'hidden',
                        button_previous: 'hidden',
                        button_next: 'hidden',
                        chevron: 'hidden',
                      }}
                    />
                  )}
                </div>

                {/* Aba Mês: grade 3x4 com os 12 meses por extenso */}
                <div
                  role="tabpanel"
                  id={`${id}-painel-mes`}
                  aria-labelledby={`${id}-aba-mes`}
                  className="mt-3"
                >
                  {aba === 'mes' && (
                    <div className="grid grid-cols-3 gap-2">
                      {MESES_PT.map((nome, indice) => (
                        <button
                          key={nome}
                          type="button"
                          aria-pressed={view.mes === indice}
                          onClick={() => {
                            irPara(indice, view.ano)
                            setAba('dia')
                          }}
                          className={cn(
                            'rounded-2xl px-2 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            view.mes === indice
                              ? 'bg-blue text-white shadow-clay-btn'
                              : 'bg-cream text-navy hover:bg-blue/10',
                          )}
                        >
                          {nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aba Ano: grade paginada com as setas (~12 por página) */}
                <div
                  role="tabpanel"
                  id={`${id}-painel-ano`}
                  aria-labelledby={`${id}-aba-ano`}
                  className="mt-3"
                >
                  {aba === 'ano' && (
                    <div className="grid grid-cols-3 gap-2">
                      {anosPagina.map((ano) => (
                        <button
                          key={ano}
                          type="button"
                          aria-pressed={view.ano === ano}
                          onClick={() => {
                            irPara(view.mes, ano)
                            setAba('mes')
                          }}
                          className={cn(
                            'rounded-2xl px-2 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            view.ano === ano
                              ? 'bg-blue text-white shadow-clay-btn'
                              : 'bg-cream text-navy hover:bg-blue/10',
                          )}
                        >
                          {ano}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aplicar: aplica a data escolhida e fecha (sem Limpar/legenda) */}
                <div className="mt-4 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={aplicar}
                    disabled={pendingDay === null}
                    className="group relative flex h-14 w-full items-center justify-center rounded-full bg-blue pr-14 pl-6 text-base font-bold text-white shadow-clay-btn transition-colors hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  >
                    Aplicar
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-blue transition-transform group-hover:translate-x-0.5 group-disabled:opacity-60"
                    >
                      <ArrowRight weight="bold" className="size-5" />
                    </span>
                  </button>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        {error && (
          <FieldError id={`${id}-error`} className="pl-5">
            {error}
          </FieldError>
        )}
      </FieldContent>
    </Field>
  )
}
