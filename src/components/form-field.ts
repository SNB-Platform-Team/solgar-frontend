/**
 * Required-field markers for the entry forms (Аптеки/Врачи). Spread
 * `requiredFieldProps(key, invalid)` on a field's wrapper <div>: while
 * `invalid`, its input / select trigger turns red and «Обязательное поле»
 * appears under it (the `[data-invalid]` rules in styles/index.css).
 */
export function requiredFieldProps(field: string, invalid: boolean) {
  return {
    'data-field': field,
    'data-invalid': invalid ? '' : undefined,
  }
}

/** Scrolls the first marked field (in page order) into view and focuses its
 * control. Call after the markers have rendered. */
export function scrollToFirstInvalidField() {
  const field = document.querySelector<HTMLElement>('[data-invalid]')
  if (!field) return
  field.scrollIntoView({ behavior: 'smooth', block: 'center' })
  field
    .querySelector<HTMLElement>(
      '[data-slot=input], [data-slot=select-trigger], input, button'
    )
    ?.focus({ preventScroll: true })
}
