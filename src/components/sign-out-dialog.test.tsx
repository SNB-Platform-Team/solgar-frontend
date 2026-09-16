import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const redirectToLogout = vi.fn()

vi.mock('@/lib/auth', () => ({
  redirectToLogout: () => redirectToLogout(),
}))

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to the Django logout page when confirmed', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    expect(redirectToLogout).toHaveBeenCalledOnce()
  })

  it('does not redirect when Cancel is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Cancel$/i }))

    expect(redirectToLogout).not.toHaveBeenCalled()
  })
})
