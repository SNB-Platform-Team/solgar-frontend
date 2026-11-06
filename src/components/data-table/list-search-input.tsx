import { useEffect, useRef, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

/**
 * The Pharmacy/Doctor list's search box — a server-side search over all
 * records. `value` is the committed search (the URL's `search` param);
 * typing commits it through `onChange` after `delay` ms of quiet, so the
 * list isn't refetched on every keystroke. A `value` changed from outside
 * (e.g. «Сбросить все фильтры», Назад/Вперёд) replaces what's typed.
 */
export function ListSearchInput({
  value,
  onChange,
  placeholder = 'Поиск по таблице...',
  delay = 350,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  delay?: number
}) {
  const [input, setInput] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    // Don't clobber trailing spaces still being typed.
    if (input.trim() !== value) setInput(value)
  }

  // The latest onChange without restarting the timer on every parent render.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const next = input.trim()
    if (next === value) return
    const timer = setTimeout(() => onChangeRef.current(next), delay)
    return () => clearTimeout(timer)
  }, [input, value, delay])

  return (
    <div className='relative w-full max-w-sm'>
      <SearchIcon className='absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className='h-8 ps-8'
      />
    </div>
  )
}
