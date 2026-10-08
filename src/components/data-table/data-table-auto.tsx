import { useMemo, useState } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
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
import { DataTableColumnHeader } from './column-header'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTablePagination } from './pagination'

type AutoRow = Record<string, unknown>

// A column with between 2 and this many distinct values across the whole
// dataset reads as "enum-like" (Тип операции, Дистрибьютор, ...) and gets
// its own faceted filter dropdown in the toolbar, same as the openstatus
// /auto demo this is modeled on. Columns with more unique values than this
// (free text, amounts, IDs) are sort/search-only — faceting those would
// just be a dropdown with hundreds of entries.
const MAX_FACET_VALUES = 20

interface DataTableAutoProps {
  data: AutoRow[]
  /** Column order/labels — defaults to the keys of the first row (object
   * key order matches insertion order for plain string keys, so this lines
   * up with however the caller built each row) when omitted. */
  columns?: string[]
  searchPlaceholder?: string
}

/**
 * A client-side table that infers its columns from plain object rows —
 * no per-dataset column config needed, unlike the typed Users/Tasks data
 * tables elsewhere in this app. Built for small, already-filtered API
 * results (a report's rows, say), not for large/server-paginated lists —
 * sorting, faceted filters, the search box, pagination and the row-detail
 * panel all run in the browser over whatever `data` already holds.
 */
export function DataTableAuto({
  data,
  columns,
  searchPlaceholder = 'Поиск...',
}: DataTableAutoProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  // Columns hidden via a header's Hide item — brought back through the
  // Столбцы menu in the toolbar.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [selectedRow, setSelectedRow] = useState<AutoRow | null>(null)

  const columnKeys = useMemo(
    () => columns ?? Object.keys(data[0] ?? {}),
    [columns, data]
  )

  // Enum-like columns get a faceted filter; numeric columns (amounts,
  // counts) and anything with too many distinct values don't.
  const facetKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const key of columnKeys) {
      const values = new Set<string>()
      let allNonNumeric = true
      for (const row of data) {
        const v = row[key]
        if (typeof v === 'number') {
          allNonNumeric = false
          break
        }
        values.add(v == null ? '' : String(v))
        if (values.size > MAX_FACET_VALUES) break
      }
      if (
        allNonNumeric &&
        values.size >= 2 &&
        values.size <= MAX_FACET_VALUES
      ) {
        keys.add(key)
      }
    }
    return keys
  }, [columnKeys, data])

  const tableColumns = useMemo<ColumnDef<AutoRow>[]>(
    () =>
      columnKeys.map((key) => ({
        id: key,
        meta: { label: key },
        // accessorFn (not accessorKey) — column headers can contain
        // characters accessorKey's dot-path syntax would otherwise trip on.
        accessorFn: (row) => row[key],
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={key} />
        ),
        cell: ({ getValue }) => {
          const value = getValue()
          return typeof value === 'number'
            ? value.toLocaleString('ru-RU')
            : ((value as string | null) ?? '—')
        },
        filterFn: facetKeys.has(key)
          ? (row, id, value: string[]) =>
              value.includes(String(row.getValue(id) ?? ''))
          : undefined,
      })),
    [columnKeys, facetKeys]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const isFiltered = columnFilters.length > 0 || globalFilter.length > 0

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className='h-8 w-full max-w-sm'
        />
        {Array.from(facetKeys).map((key) => {
          const column = table.getColumn(key)
          if (!column) return null
          const facetValues = Array.from(
            column.getFacetedUniqueValues().keys()
          ).sort((a, b) => String(a).localeCompare(String(b)))
          return (
            <DataTableFacetedFilter
              key={key}
              column={column}
              title={key}
              options={facetValues.map((v) => ({
                label: v === '' ? '(пусто)' : String(v),
                value: String(v),
              }))}
            />
          )
        })}
        {isFiltered && (
          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-2 lg:px-3'
            onClick={() => {
              table.resetColumnFilters()
              setGlobalFilter('')
            }}
          >
            Сбросить
            <X className='ms-1 size-4' />
          </Button>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='ms-auto h-8'>
              <SlidersHorizontal className='size-4' />
              Столбцы
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='end'
            className='max-h-96 w-56 overflow-y-auto'
          >
            <DropdownMenuLabel>Показать столбцы</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className='capitalize'
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  // Keep the menu open so several columns can be toggled
                  // in one go.
                  onSelect={(e) => e.preventDefault()}
                >
                  {column.columnDef.meta?.label ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className='scroll-x-visible overflow-hidden rounded-md border'>
        <Table className='min-w-max'>
          <TableHeader className='bg-muted/40'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='whitespace-nowrap'>
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => setSelectedRow(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='whitespace-nowrap'>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length || 1}
                  className='h-24 text-center text-muted-foreground'
                >
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />

      {/* Row detail panel — click any row to see every column/value pair
          for it, same convention as the openstatus /auto demo's row sheet. */}
      <Sheet
        open={selectedRow !== null}
        onOpenChange={(open) => !open && setSelectedRow(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Детали записи</SheetTitle>
          </SheetHeader>
          <div className='space-y-3 overflow-y-auto px-4 pb-4'>
            {selectedRow &&
              columnKeys.map((key) => (
                <div key={key} className='space-y-0.5'>
                  <div className='text-xs text-muted-foreground'>{key}</div>
                  <div className='text-sm font-medium break-words'>
                    {typeof selectedRow[key] === 'number'
                      ? (selectedRow[key] as number).toLocaleString('ru-RU')
                      : ((selectedRow[key] as string | null) ?? '—')}
                  </div>
                </div>
              ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
