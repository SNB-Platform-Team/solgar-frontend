import { useId } from 'react'
import { cn } from '@/lib/utils'

interface BrandSpinnerProps {
  /** Pixel size of the rendered icon (square). */
  size?: number
  className?: string
  /** Accessible label for screen readers. */
  label?: string
}

/**
 * Solgar-themed loading spinner — a gold/cream capsule pill that rotates
 * with an eased motion (see `.brand-spinner` in styles/index.css). Used
 * wherever the app needs a spinner-style loading indicator: route
 * transitions (routes/_authenticated/route.tsx) and in-flight mutations
 * (the upload screens' "Предпросмотр"/"Сохранить" buttons).
 */
export function BrandSpinner({
  size = 40,
  className,
  label = 'Загрузка…',
}: BrandSpinnerProps) {
  const clipId = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 100 100'
      role='status'
      aria-label={label}
      className={cn('shrink-0', className)}
    >
      <g className='brand-spinner'>
        <defs>
          <clipPath id={clipId}>
            <rect x='34' y='18' width='32' height='64' rx='16' />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect x='34' y='18' width='32' height='32' fill='#c9a84c' />
          <rect x='34' y='50' width='32' height='32' fill='#f0e2b8' />
        </g>
        <rect
          x='34'
          y='18'
          width='32'
          height='64'
          rx='16'
          fill='none'
          stroke='#8a6d2e'
          strokeWidth='1.5'
        />
      </g>
    </svg>
  )
}
