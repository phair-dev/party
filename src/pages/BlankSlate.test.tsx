import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_EMAILS, BLANK_SLATE_PROMPTS } from '../config'
import * as hooks from '../hooks'
import BlankSlate from './BlankSlate'

vi.mock('../firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('../hooks')

function setup(email: string | null) {
  vi.mocked(hooks.useUser).mockReturnValue({ user: email ? ({ email } as never) : null, ready: true })
  vi.mocked(hooks.isAdminUser).mockImplementation((u) => !!u?.email && ADMIN_EMAILS.includes(u.email))
  return render(<BlankSlate />)
}

beforeEach(() => vi.clearAllMocks())

describe('BlankSlate', () => {
  it('asks signed-out visitors to sign in and hides the prompts', () => {
    setup(null)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    expect(screen.queryByAltText('Shared Brains')).not.toBeInTheDocument()
  })

  it('rejects non-admins', () => {
    setup('guest@example.com')
    expect(screen.getByText(/is not an admin/)).toBeInTheDocument()
  })

  it('steps through the prompts with the blank shown as a line', async () => {
    setup(ADMIN_EMAILS[0])
    expect(screen.getByAltText('Shared Brains')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'BLOOD blank' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'blank WOLF' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByAltText('Shared Brains')).toBeInTheDocument()
  })

  it('stops on the last prompt', async () => {
    setup(ADMIN_EMAILS[0])
    for (let i = 0; i < BLANK_SLATE_PROMPTS.length + 3; i++) await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'blank CAT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled()
  })
})
