import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SearchPage from '../pages/SearchPage'
import { renderWithProviders } from '../test-utils'

const buildResponse = (name = 'repo-one') =>
  new Response(
    JSON.stringify({
      total_count: 25,
      incomplete_results: false,
      items: [
        {
          id: 1,
          name,
          full_name: `octocat/${name}`,
          description: 'Example description',
          html_url: `https://github.com/octocat/${name}`,
          language: 'TypeScript',
          stargazers_count: 42,
          forks_count: 10,
          updated_at: '2024-01-01T00:00:00Z',
          owner: {
            login: 'octocat',
            avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
            html_url: 'https://github.com/octocat',
          },
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

describe('SearchPage', () => {
  let fetchMock: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(buildResponse()))
  })

  afterEach(() => {
    fetchMock.mockRestore()
  })

  it('renders results and refetches on new search', async () => {
    renderWithProviders(<SearchPage />)

    await waitFor(() => expect(screen.getByText('repo-one')).toBeInTheDocument(), {
      timeout: 2000,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'vue')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 2500 })
  })

  it('shows pagination controls when multiple pages exist', async () => {
    renderWithProviders(<SearchPage />, ['/'])

    await waitFor(() => expect(screen.getByText('repo-one')).toBeInTheDocument(), {
      timeout: 2000,
    })
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })
})
