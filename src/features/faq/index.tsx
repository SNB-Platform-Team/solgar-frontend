import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronRight,
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  type FaqDocument,
  type FaqDocumentFolder,
  type FaqResponse,
} from './types'

// The "which screens am I allowed to see" answer gets the user's actual
// screen list appended as badges — matched loosely so minor wording changes
// on the backend don't silently stop working.
const isScreensQuestion = (q: string) =>
  q.toLowerCase().includes('раздел') && q.toLowerCase().includes('доступн')

// 3677296 → "3,5 МБ" — shown next to each instruction so users know what
// they're about to open.
function formatFileSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / (1024 * 1024)).toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
  })} МБ`
}

// Icon + short type label from the file's content type.
function documentKind(doc: FaqDocument): {
  icon: React.ElementType
  label: string
} {
  const ct = (doc.content_type ?? '').toLowerCase()
  if (ct === 'application/pdf') return { icon: FileText, label: 'PDF' }
  if (ct.startsWith('image/')) return { icon: FileImage, label: 'Изображение' }
  if (ct.includes('spreadsheet') || ct.includes('excel') || ct === 'text/csv')
    return { icon: FileSpreadsheet, label: 'Excel' }
  if (ct.includes('word') || ct.includes('opendocument.text'))
    return { icon: FileText, label: 'Word' }
  if (ct.includes('zip') || ct.includes('rar') || ct.includes('7z'))
    return { icon: FileArchive, label: 'Архив' }
  return { icon: File, label: 'Файл' }
}

// The backend hands back a path (/sales/api/faq/document/1/); resolve it
// against the same API origin every other request uses, so the link also
// works when VITE_API_URL points somewhere other than the page's origin.
function documentHref(doc: FaqDocument): string {
  return doc.url.startsWith('/')
    ? `${api.defaults.baseURL ?? ''}${doc.url}`
    : doc.url
}

export function Faq() {
  const { data, isLoading, error } = useQuery<FaqResponse>({
    queryKey: ['faq'],
    queryFn: async () => {
      const res = await api.get<FaqResponse>('/sales/api/faq/')
      return res.data
    },
  })

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Часто задаваемые вопросы
          </h1>
          {data && (
            <p className='text-muted-foreground'>
              Вы вошли как: {data.user_display}
            </p>
          )}
        </div>

        <Card>
          <CardContent>
            {error ? (
              <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                Ошибка загрузки данных
              </div>
            ) : isLoading ? (
              <div className='space-y-4'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : data && data.faq.length > 0 ? (
              <Accordion type='single' collapsible>
                {data.faq.map((entry, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`}>
                    <AccordionTrigger>{entry.q}</AccordionTrigger>
                    <AccordionContent>
                      <p className='whitespace-pre-line'>{entry.a}</p>
                      {isScreensQuestion(entry.q) &&
                        data.my_screens.length > 0 && (
                          <div className='mt-3 flex flex-wrap gap-2'>
                            {data.my_screens.map((screen) => (
                              <Badge key={screen} variant='secondary'>
                                {screen}
                              </Badge>
                            ))}
                          </div>
                        )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className='py-16 text-center text-muted-foreground italic'>
                Нет данных
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents by folder — same response, no extra request. Hidden
            entirely (heading included) when there are no folders at all. */}
        {data?.document_folders && data.document_folders.length > 0 && (
          <DocumentBrowser folders={data.document_folders} />
        )}
      </Main>
    </>
  )
}

// A folder's identity — «Прочее» (files in no folder) comes back without an
// id, so its name stands in.
const folderKey = (folder: FaqDocumentFolder) =>
  folder.id !== null ? `id-${folder.id}` : `name-${folder.name}`

// "3 документа", "5 документов", "1 документ", "21 документ"...
function documentCount(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'документ'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'документа'
        : 'документов'
  return `${n} ${word}`
}

// A file-browser view over the folders: their cards first, then — once one
// is clicked — that folder's documents with a way back. View-only: uploads
// happen in the admin panel, not here.
function DocumentBrowser({ folders }: { folders: FaqDocumentFolder[] }) {
  // Kept as a key rather than the folder object, so a refetched list still
  // finds it — and falls back to the folder list if it's gone.
  const [openKey, setOpenKey] = useState<string | null>(null)
  const openFolder = folders.find((f) => folderKey(f) === openKey) ?? null

  return (
    <section className='mt-8 space-y-4'>
      <h2 className='text-2xl font-bold tracking-tight'>Документы</h2>

      {openFolder ? (
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setOpenKey(null)}
            >
              <ArrowLeft className='size-4' />
              Назад
            </Button>
            <h3 className='flex min-w-0 items-center gap-2 font-semibold'>
              <FolderOpen className='size-4 shrink-0 text-primary' />
              <span className='truncate'>{openFolder.name}</span>
            </h3>
          </div>
          {openFolder.documents.length > 0 ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              {openFolder.documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground'>
              <FolderOpen className='size-8' />
              <p className='text-sm'>В этой папке пока нет документов</p>
            </div>
          )}
        </div>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {folders.map((folder) => (
            <button
              key={folderKey(folder)}
              type='button'
              onClick={() => setOpenKey(folderKey(folder))}
              className='group rounded-xl text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            >
              <Card className='py-4 transition-colors group-hover:border-primary/50 group-hover:bg-accent/50'>
                <CardContent className='flex items-center gap-3'>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                    <Folder className='size-5' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate font-medium'>{folder.name}</div>
                    <div className='text-xs text-muted-foreground'>
                      {documentCount(folder.documents.length)}
                    </div>
                  </div>
                  <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// PDFs and images open in a new tab; anything else is a plain link the
// backend answers as an attachment, so the browser downloads it in place.
function DocumentCard({ doc }: { doc: FaqDocument }) {
  const { icon: Icon, label } = documentKind(doc)
  const opensInline = doc.inline !== false
  return (
    <a
      href={documentHref(doc)}
      {...(opensInline
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : { download: '' })}
      className='group rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
    >
      <Card className='py-4 transition-colors group-hover:border-primary/50 group-hover:bg-accent/50'>
        <CardContent className='flex items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
            <Icon className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='truncate font-medium'>{doc.title}</div>
            <div className='text-xs text-muted-foreground'>
              {label}
              {doc.size ? ` · ${formatFileSize(doc.size)}` : ''}
            </div>
          </div>
          {opensInline ? (
            <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
          ) : (
            <Download className='size-4 shrink-0 text-muted-foreground' />
          )}
        </CardContent>
      </Card>
    </a>
  )
}
