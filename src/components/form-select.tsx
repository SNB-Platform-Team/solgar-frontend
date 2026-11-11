import { useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Radix Select item values can't be an empty string — "not set" is mapped to
// this sentinel.
const EMPTY = '__EMPTY__'

// A plain "<Select/>" for the entry form — no "Все" item (this isn't a
// filter, an empty value here just means the field wasn't filled in).
export function FormSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Не выбрано',
  requires,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** For a cascade field: the caption of the field that unlocks it, shown
   * on hover while `disabled` as «Сначала выберите «{requires}»». */
  requires?: string
}) {
  // The current value is always shown, whether or not it's in `options`:
  // "Найти адрес" can set values the cascade lists don't know, and clicking
  // a table row sets Город/Регион/Область before their lists return. So:
  //  1. The value is always one of the items (added up front unless that
  //     exact string is already there), so Radix can select it.
  //  2. SelectValue is given the label directly. Otherwise Radix only fills
  //     the trigger once the matching item has rendered, which left the
  //     field blank on the first row click when the list arrived late.
  // Blank and duplicate options are dropped — Radix rejects an empty item
  // value, and a repeated one would duplicate its React key.
  // The value and options can arrive as numbers (e.g. sku is an integer
  // column server-side) or null — everything is compared as a string.
  const strValue = String(value ?? '')
  const trimmed = strValue.trim()
  const cleanOptions = Array.from(
    new Set(options.map((o) => String(o ?? '')).filter((o) => o.trim() !== ''))
  )
  const allOptions =
    trimmed !== '' && !cleanOptions.includes(strValue)
      ? [strValue, ...cleanOptions]
      : cleanOptions
  const selectValue = trimmed === '' ? EMPTY : strValue

  // Inside a <form>, Radix also renders a hidden native <select>, and
  // anything that changes that one fires onValueChange too — the browser's
  // address autofill does (picking a saved address in Адрес клиники
  // silently set Город to the profile's city), and so does Radix's own echo
  // of a value it has no <option> for yet. So a change only counts while
  // the user is actually on this field: its list open, or its trigger
  // focused (keyboard typeahead on the closed trigger).
  const openRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const select = (
    <Select
      value={selectValue}
      onOpenChange={(open) => {
        openRef.current = open
      }}
      onValueChange={(v) => {
        const fromUser =
          openRef.current || document.activeElement === triggerRef.current
        // A bare '' never comes from the user (a picked "—" is EMPTY).
        if (!fromUser || v === '') return
        onChange(v === EMPTY ? '' : v)
      }}
      disabled={disabled}
    >
      <SelectTrigger ref={triggerRef} className='w-full'>
        <SelectValue placeholder={placeholder}>
          {selectValue === EMPTY ? '—' : strValue}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY}>—</SelectItem>
        {allOptions.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (!disabled || !requires) return select
  // A disabled button gets no pointer events, so the tooltip hangs off a
  // wrapper instead (which keeps the not-allowed cursor).
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='w-full cursor-not-allowed [&_[data-slot=select-trigger]]:pointer-events-none'>
          {select}
        </div>
      </TooltipTrigger>
      <TooltipContent>Сначала выберите «{requires}»</TooltipContent>
    </Tooltip>
  )
}
