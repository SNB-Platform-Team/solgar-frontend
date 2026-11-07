import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
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
  const trimmed = (value ?? '').trim()
  const cleanOptions = Array.from(
    new Set(options.filter((o) => (o ?? '').trim() !== ''))
  )
  const allOptions =
    trimmed !== '' && !cleanOptions.includes(value)
      ? [value, ...cleanOptions]
      : cleanOptions
  const selectValue = trimmed === '' ? EMPTY : value

  return (
    <Select
      value={selectValue}
      // A bare '' never comes from the user (a picked "—" is EMPTY): it's
      // Radix's hidden native <select> echoing a value it has no <option>
      // for yet — e.g. a whole record loaded into the form before the
      // cascade lists arrive — which would otherwise wipe the field.
      onValueChange={(v) => {
        if (v === '') return
        onChange(v === EMPTY ? '' : v)
      }}
      disabled={disabled}
    >
      <SelectTrigger className='w-full'>
        <SelectValue placeholder={placeholder}>
          {selectValue === EMPTY ? '—' : value}
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
}
