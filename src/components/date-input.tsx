import { useEffect, useRef, useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { ru } from 'react-day-picker/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Native <input type='date'> renders in the *browser's* UI locale (Chrome
// ignores the page's lang attribute), so a US-English browser shows
// mm/dd/yyyy. This shows dd.mm.yyyy (ru-RU) regardless, while the value it
// reads/writes stays the same yyyy-MM-dd string the APIs expect — a
// drop-in replacement for those inputs.

/** yyyy-MM-dd → dd.mm.yyyy ('' for anything else). */
function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

/** dd.mm.yyyy (or dd/mm/yyyy) → yyyy-MM-dd, or null if not a real date. */
function displayToIso(text: string): string | null {
  const m = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(text.trim())
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  )
    return null
  return `${yyyy}-${mm}-${dd}`
}

/** Local-midnight Date for a yyyy-MM-dd string (no UTC day shift). */
function isoToDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}

function dateToIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Inserts the dots as the user types digits: "0106" → "01.06". */
function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

interface DateInputProps {
  /** yyyy-MM-dd, or '' for no date. */
  value: string
  /** Called with yyyy-MM-dd, or '' once the field is cleared. */
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
}

export function DateInput({
  value,
  onChange,
  required,
  disabled,
  className,
}: DateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value))
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Follow outside changes (form reset, a record loaded into the form) —
  // but don't clobber a half-typed date that hasn't produced a value yet.
  // (Adjusted during render rather than in an effect — React's recommended
  // pattern for deriving state from a changed prop.)
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (displayToIso(text) !== value) setText(isoToDisplay(value))
  }

  // A non-empty but invalid entry blocks native form submission, same as a
  // native date input would.
  const invalid = text !== '' && displayToIso(text) === null
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      invalid ? 'Введите дату в формате дд.мм.гггг' : ''
    )
  }, [invalid])

  const handleTextChange = (raw: string) => {
    const next = autoFormat(raw)
    setText(next)
    if (next === '') {
      onChange('')
      return
    }
    const iso = displayToIso(next)
    if (iso) onChange(iso)
  }

  const selected = isoToDate(value)

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={() => {
          // Drop an unfinished entry back to the last valid value.
          if (invalid) setText(isoToDisplay(value))
        }}
        placeholder='дд.мм.гггг'
        inputMode='numeric'
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className='pe-9 tabular-nums'
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={disabled}
            aria-label='Открыть календарь'
            className='absolute end-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground'
          >
            <CalendarIcon className='size-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='end'>
          <Calendar
            mode='single'
            locale={ru}
            captionLayout='dropdown'
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (!d) return
              const iso = dateToIso(d)
              setText(isoToDisplay(iso))
              onChange(iso)
              setOpen(false)
            }}
            formatters={{
              formatMonthDropdown: (date) =>
                date.toLocaleString('ru-RU', { month: 'short' }),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
