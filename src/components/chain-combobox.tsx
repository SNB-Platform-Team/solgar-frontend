import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Searchable Сеть picker shared by every screen that lets the user choose a
 * pharmacy chain (Sales Upload, Chain Report, …) — a plain Select doesn't
 * scale to the ~180-entry chain list, so this backs the trigger with a
 * filterable Command list instead. Always fed by usePharmacyChains(); never
 * wire this to any other chain source.
 */
export function ChainCombobox({
  value,
  onChange,
  chains,
  loading = false,
  disabled = false,
  allowAll = false,
  placeholder = 'Выберите сеть',
  className,
}: {
  value: string
  onChange: (value: string) => void
  chains: string[]
  loading?: boolean
  disabled?: boolean
  /** Adds a leading "Все" item that reports back an empty string — for
   * filter-style dropdowns where no selection means "every chain". */
  allowAll?: boolean
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const label = loading
    ? 'Загрузка сетей…'
    : value || (allowAll ? 'Все' : placeholder)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className='truncate'>{label}</span>
          <ChevronsUpDown className='ms-2 size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-(--radix-popover-trigger-width) p-0'>
        <Command>
          <CommandInput placeholder='Поиск сети...' />
          <CommandList>
            <CommandEmpty>Сеть не найдена.</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value='Все'
                  onSelect={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('size-4', value === '' ? 'opacity-100' : 'opacity-0')}
                  />
                  Все
                </CommandItem>
              )}
              {chains.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={() => {
                    onChange(c)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('size-4', c === value ? 'opacity-100' : 'opacity-0')}
                  />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
