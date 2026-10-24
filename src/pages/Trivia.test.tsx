import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_EMAILS } from '../config'
import * as hooks from '../hooks'
import { TRIVIA } from '../trivia'
import Trivia from './Trivia'

vi.mock('../firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('../hooks')

function setup(email: string | null) {
  vi.mocked(hooks.useUser).mockReturnValue({ user: email ? ({ email } as never) : null, ready: true })
  vi.mocked(hooks.isAdminUser).mockImplementation((u) => !!u?.email && ADMIN_EMAILS.includes(u.email))
  return render(<Trivia />)
}

beforeEach(() => vi.clearAllMocks())

describe('Trivia', () => {
  it('asks signed-out visitors to sign in and hides the answers', () => {
    setup(null)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    expect(screen.queryByAltText('Immortal Duos')).not.toBeInTheDocument()
  })

  it('rejects non-admins', () => {
    setup('guest@example.com')
    expect(screen.getByText(/is not an admin/)).toBeInTheDocument()
  })

  it('shows the prompt, then reveals the answer with its source image', async () => {
    setup(ADMIN_EMAILS[0])
    expect(screen.getByAltText('Immortal Duos')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'Lloyd Christmas & ____' })).toBeInTheDocument()
    expect(screen.queryByAltText('Dumb and Dumber (1994)')).not.toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'Lloyd Christmas & Harry Dunne' })).toBeInTheDocument()
    expect(screen.getByAltText('Dumb and Dumber (1994)')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'Garth Algar & ____' })).toBeInTheDocument()
  })

  it('stops on the last answer', async () => {
    setup(ADMIN_EMAILS[0])
    for (let i = 0; i < TRIVIA.length * 2 + 3; i++) await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'Elizabeth Bennet & Mr. Darcy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled()
  })
})

describe('Trivia tab', () => {
  it('sets the tab title and icon, then restores them on leave', () => {
    document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="orig.svg">')
    document.title = 'Costume Contest'
    const { unmount } = setup(null)
    expect(document.title).toBe('Immortal Duos')
    expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href).toContain('%F0%9F%93%9D')
    unmount()
    expect(document.title).toBe('Costume Contest')
    expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.getAttribute('href')).toBe('orig.svg')
  })
})
