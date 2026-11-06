import { useMutation } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { downloadFile } from '@/lib/download'
import { Button } from '@/components/ui/button'

/**
 * «Скачать в Excel» — downloads an .xlsx export endpoint. `getUrl` is called
 * on click, so it always carries the params currently on screen. Errors go
 * through the global mutation error handler (toast).
 */
export function ExportExcelButton({
  getUrl,
  fallbackName = 'export.xlsx',
  disabled,
}: {
  getUrl: () => string
  fallbackName?: string
  disabled?: boolean
}) {
  const exportMutation = useMutation({
    mutationFn: () => downloadFile(getUrl(), fallbackName),
  })

  return (
    <Button
      type='button'
      variant='outline'
      disabled={disabled || exportMutation.isPending}
      onClick={() => exportMutation.mutate()}
    >
      {exportMutation.isPending ? (
        <Loader2 className='size-4 animate-spin' />
      ) : (
        <FileSpreadsheet className='size-4' />
      )}
      Скачать в Excel
    </Button>
  )
}
