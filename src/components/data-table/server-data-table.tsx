import { useMemo, useState } from 'react'
import {
  type Column,
  type ColumnDef,
  type FilterFn,
  type SortingFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  PanelRightOpen,
  Search as SearchIcon,
  X,
} from 'lucide-react'
import { findAddressColumns, isAddressMissing } from '@/lib/address-columns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ServerCell = string | number | null
export type ServerRow = ServerCell[]

// A stable empty-array reference for useReactTable's `data` — a fresh `[]`
// literal on every render would make TanStack Table think the data changed
// and recompute row models for nothing.
const EMPTY_ROWS: ServerRow[] = []

const DETAILS_COLUMN_ID = '__details__'

// Case-insensitive substring match over every column of the row — TanStack's
// built-in includesString only considers columns whose *first row* value is
// a string/number, which silently skips any column that starts with a null.
const matchesSearch: FilterFn<ServerRow> = (row, columnId, filterValue) => {
  const value = row.getValue<ServerCell>(columnId)
  if (value == null) return false
  return String(value)
    .toLowerCase()
    .includes(String(filterValue).trim().toLowerCase())
}

// Numbers numerically, everything else as natural-order text, blanks last
// regardless of direction — the backend sends mixed number/string/null
// cells per column, which TanStack's 'auto' sortingFn (picked from the
// first row only) doesn't handle consistently.
const compareCells: SortingFn<ServerRow> = (a, b, columnId) => {
  const x = a.getValue<ServerCell>(columnId)
  const y = b.getValue<ServerCell>(columnId)
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x ?? '').localeCompare(String(y ?? ''), 'ru', {
    numeric: true,
  })
}

interface ServerDataTableProps {
  /** Column headers exactly as the backend sends them (data.columns). */
  columns: string[]
  /** One page of rows (data.rows) — row[0] is the record's id. */
  rows: ServerRow[] | undefined
  /** Id of the record currently loaded into the entry form, if any. */
  selectedId: string | number | null
  /** Plain row click — fills the entry form (CRUD), unchanged behaviour. */
  onRowClick: (id: string) => void
  /** Dims the table while the next server page is loading. */
  dimmed?: boolean
  /** Title prefix for the read-only details panel. */
  detailsTitle?: string
}

/**
 * The Pharmacy/Doctor list table: the backend still owns pagination and
 * the real filters, so this only adds what can be done over the rows of
 * the page already loaded — a quick search box, per-column sorting and a
 * separate "Детали записи" button that opens every field of a row in a
 * read-only side panel. Clicking the row itself is left to the caller (it
 * fills the entry form), and the missing-address/selected-row highlights
 * are kept as-is.
 */
export function ServerDataTable({
  columns,
  rows,
  selectedId,
  onRowClick,
  dimmed,
  detailsTitle = 'Детали записи',
}: ServerDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [detailRow, setDetailRow] = useState<ServerRow | null>(null)

  const addressCols = useMemo(() => findAddressColumns(columns), [columns])

  const tableColumns = useMemo<ColumnDef<ServerRow>[]>(
    () => [
      {
        id: DETAILS_COLUMN_ID,
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => <span className='sr-only'>Детали записи</span>,
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-7 text-muted-foreground hover:text-foreground'
                aria-label='Детали записи'
                onClick={(e) => {
                  // Don't let this also count as a row click (= load into
                  // the entry form) — the two actions are separate.
                  e.stopPropagation()
                  setDetailRow(row.original)
                }}
              >
                <PanelRightOpen className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Детали записи</TooltipContent>
          </Tooltip>
        ),
      },
      ...columns.map<ColumnDef<ServerRow>>((header, colIndex) => ({
        id: `col-${colIndex}`,
        accessorFn: (row) => row[colIndex],
        header: ({ column }) => (
          <SortableHeader column={column} title={header} />
        ),
        cell: ({ getValue }) => (getValue() as ServerCell) ?? '',
        sortingFn: compareCells,
        filterFn: matchesSearch,
      })),
    ],
    [columns]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows ?? EMPTY_ROWS,
    columns: tableColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: matchesSearch,
    getColumnCanGlobalFilter: (column) => column.id !== DETAILS_COLUMN_ID,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const visibleRows = table.getRowModel().rows
  const totalOnPage = rows?.length ?? 0
  const isFiltered = globalFilter.trim() !== ''

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative w-full max-w-sm'>
          <SearchIcon className='absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder='Поиск по таблице...'
            className='h-8 ps-8'
          />
        </div>
        {(isFiltered || sorting.length > 0) && (
          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-2 lg:px-3'
            onClick={() => {
              setGlobalFilter('')
              setSorting([])
            }}
          >
            Сбросить
            <X className='ms-1 size-4' />
          </Button>
        )}
        <span className='text-xs text-muted-foreground'>
          {isFiltered
            ? `Найдено ${visibleRows.length} из ${totalOnPage} на этой странице`
            : 'Поиск и сортировка — по текущей странице'}
        </span>
      </div>

      <div
        className={cn(
          // Far more columns than any viewport — scroll-x-visible keeps a
          // fat, always-on horizontal scrollbar so that's discoverable, and
          // min-w-max on <Table> lets it grow to its full content width.
          'scroll-x-visible max-h-[600px] overflow-y-auto rounded-md border transition-opacity',
          dimmed && 'opacity-60'
        )}
      >
        <Table className='min-w-max'>
          <TableHeader className='sticky top-0 z-10 bg-muted/40 backdrop-blur'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'font-semibold whitespace-nowrap',
                      header.column.id === DETAILS_COLUMN_ID && 'w-10 px-1'
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map((row) => {
                const original = row.original
                const id = original[0] != null ? String(original[0]) : ''
                const selected =
                  id !== '' && selectedId != null && id === String(selectedId)
                const missingAddress = isAddressMissing(original, addressCols)
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => onRowClick(id)}
                    className={cn(
                      id && 'cursor-pointer',
                      missingAddress &&
                        'bg-destructive/10 hover:bg-destructive/15',
                      selected &&
                        (missingAddress
                          ? 'bg-destructive/20 hover:bg-destructive/25'
                          : 'bg-primary/10 hover:bg-primary/15'),
                      selected && 'border-l-4 border-l-primary'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'py-2.5 whitespace-nowrap',
                          cell.column.id === DETAILS_COLUMN_ID && 'px-1 py-1',
                          typeof cell.getValue() === 'number' &&
                            'text-right tabular-nums'
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow className='hover:bg-transparent'>
                <TableCell
                  colSpan={tableColumns.length}
                  className='h-24 text-center text-muted-foreground italic'
                >
                  {isFiltered
                    ? 'Ничего не найдено на этой странице'
                    : 'Нет данных'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Read-only record panel — every column/value pair of the row. Edits
          still go through the entry form (plain row click). */}
      <Sheet
        open={detailRow !== null}
        onOpenChange={(open) => !open && setDetailRow(null)}
      >
        <SheetContent className='sm:max-w-md'>
          <SheetHeader>
            <SheetTitle>{detailsTitle}</SheetTitle>
            <SheetDescription>
              {detailRow?.[0] != null ? `ID ${detailRow[0]} · ` : ''}
              только просмотр — для изменения нажмите на строку
            </SheetDescription>
          </SheetHeader>
          <dl className='divide-y overflow-y-auto px-4 pb-4'>
            {detailRow &&
              columns.map((header, idx) => {
                const value = detailRow[idx]
                const empty = value == null || String(value).trim() === ''
                return (
                  <div key={`${header}-${idx}`} className='space-y-0.5 py-2'>
                    <dt className='text-xs text-muted-foreground'>{header}</dt>
                    <dd
                      className={cn(
                        'text-sm font-medium break-words',
                        typeof value === 'number' && 'tabular-nums',
                        empty && 'font-normal text-muted-foreground'
                      )}
                    >
                      {empty ? '—' : value}
                    </dd>
                  </div>
                )
              })}
          </dl>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Clickable column header — toggles asc/desc/unsorted (TanStack's own
// 3-state cycle) and shows which state it's in via a lucide arrow icon.
function SortableHeader<TData>({
  column,
  title,
}: {
  column: Column<TData, unknown>
  title: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className='-ms-2 h-8 gap-1 px-2 font-semibold'
      onClick={column.getToggleSortingHandler()}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp className='size-3.5' />
      ) : sorted === 'desc' ? (
        <ArrowDown className='size-3.5' />
      ) : (
        <ArrowUpDown className='size-3.5 text-muted-foreground' />
      )}
    </Button>
  )
}
