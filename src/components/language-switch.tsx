import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage } from '@/lib/i18n'
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'

/** «Язык» submenu for a profile/user dropdown: RU / EN, current one checked.
 * The pick is kept in localStorage (see lib/i18n.ts). */
export function LanguageSubMenu() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language
  const currentShort =
    LANGUAGES.find((l) => l.code === current)?.short ?? 'RU'
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className='gap-2'>
        <Languages className='size-4 text-muted-foreground' />
        {t('common.language')}
        <span className='ms-auto text-xs text-muted-foreground'>
          {currentShort}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => setLanguage(lang.code)}
            >
              <span className='w-6 text-xs font-semibold'>{lang.short}</span>
              {lang.label}
              <Check
                size={14}
                className={
                  current === lang.code ? 'ms-auto' : 'invisible ms-auto'
                }
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
