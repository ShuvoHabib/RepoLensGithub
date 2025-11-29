import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearchRepos } from '../hooks/useSearchRepos'
import { ApiError } from '../api/types'

const mockResponse = {
  total_count: 2,
  incomplete_results: false,
  items: [
    {
      id: 1,
      name: 'repo-one',
      full_name: 'octocat/repo-one',
      description: 'Test repo',
      html_url: 'https://github.com/octocat/repo-one',
      language: 'TypeScript',
      stargazers_count: 10,
      forks_count: 2,
      updated_at: '2024-01-01T00:00:00Z',
      owner: {
        login: 'octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
        html_url: 'https://github.com/octocat',
      },
    },
  ],
}

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useSearchRepos', () => {
  let fetchMock: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
  })

  afterEach(() => {
    fetchMock.mockRestore()
  })

  it('returns data when the request succeeds', async () => {
    const { result } = renderHook(
      () =>
        useSearchRepos({
          query: 'react',
          page: 1,
          sort: 'best',
          order: 'desc',
          includeForks: false,
          useProxy: false,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.items[0].name).toBe('repo-one')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('surfaces ApiError when GitHub rejects the request', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'rate limit' }), { status: 403 }),
    )

    const { result } = renderHook(
      () =>
        useSearchRepos({
          query: 'react',
          page: 1,
          sort: 'best',
          order: 'desc',
          includeForks: false,
          useProxy: false,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError))
    expect((result.current.error as ApiError).status).toBe(403)
  })
})
