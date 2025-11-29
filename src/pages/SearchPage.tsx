import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { Filters } from '../components/Filters'
import { Pagination } from '../components/Pagination'
import { RepoCard } from '../components/RepoCard'
import { RepoSkeleton } from '../components/RepoSkeleton'
import { useDebounce } from '../hooks/useDebounce'
import { getEffectiveTotalPages, useSearchRepos } from '../hooks/useSearchRepos'
import type { OrderOption, SortOption } from '../api/types'
import { ApiError } from '../api/types'

const DEFAULT_QUERY = 'react'
const MAX_PAGE = 100

const parsePage = (value: string | null) => {
  const page = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(page) || page < 1) return 1
  return Math.min(page, MAX_PAGE)
}

const parseSort = (value: string | null): SortOption =>
  value === 'stars' || value === 'updated' ? value : 'best'

const parseOrder = (value: string | null): OrderOption => (value === 'asc' ? 'asc' : 'desc')

const parseForks = (value: string | null) => value === 'include'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const useProxy = import.meta.env.VITE_USE_PROXY === 'true'

  const hasQueryParam = searchParams.has('q')
  const queryFromParams = hasQueryParam ? searchParams.get('q') ?? '' : DEFAULT_QUERY
  const [searchText, setSearchText] = useState(queryFromParams)
  const debouncedQuery = useDebounce(searchText, 500)

  const searchState = useMemo(
    () => ({
      query: queryFromParams,
      page: parsePage(searchParams.get('page')),
      sort: parseSort(searchParams.get('sort')),
      order: parseOrder(searchParams.get('order')),
      includeForks: parseForks(searchParams.get('forks')),
      language: searchParams.get('language') ?? undefined,
    }),
    [queryFromParams, searchParams],
  )

  useEffect(() => {
    setSearchText(queryFromParams)
  }, [queryFromParams])

  useEffect(() => {
    const normalized = debouncedQuery.trim()
    const current = searchParams.get('q') ?? ''
    if (normalized === current) return

    const next = new URLSearchParams(searchParams)
    next.set('q', normalized)
    next.set('page', '1')
    setSearchParams(next, { replace: true })
  }, [debouncedQuery, searchParams, setSearchParams])

  const { data, isFetching, error, refetch } = useSearchRepos({
    query: searchState.query,
    page: searchState.page,
    sort: searchState.sort,
    order: searchState.order,
    includeForks: searchState.includeForks,
    language: searchState.language,
    useProxy,
  })

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = false) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      })
      if (resetPage) {
        next.set('page', '1')
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      updateParams({ page: String(page) })
    },
    [updateParams],
  )

  const totalPages = data ? getEffectiveTotalPages(data.totalCount) : 1
  const languages = data?.languages ?? []
  const hasData = (data?.items?.length ?? 0) > 0
  const isEmpty = !isFetching && !hasData

  useEffect(() => {
    if (data && searchState.page > totalPages) {
      updateParams({ page: String(totalPages) })
    }
  }, [data, searchState.page, totalPages, updateParams])

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? 'Something went wrong while searching GitHub.'
        : null

  const showRateLimit =
    error instanceof ApiError && (error.status === 403 || (error.details ?? '').includes('rate'))

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">GitHub Explorer</p>
        <h1>Search repositories with confidence</h1>
        <p className="lede">
          Fast, debounced search with pagination, smart filters, and caching. Shareable URLs keep
          your state in sync across refreshes.
        </p>
        <div className="chip-row">
          <span className="pill subtle">{useProxy ? 'Proxy via Cloudflare' : 'Direct GitHub API'}</span>
          <span className="pill subtle">React Query caching</span>
        </div>
      </header>

      <section className="panel">
        <SearchBar
          value={searchText}
          onChange={(value) => setSearchText(value)}
          onSubmit={() => setSearchText((value) => value.trim())}
        />
        <Filters
          sort={searchState.sort}
          order={searchState.order}
          includeForks={searchState.includeForks}
          language={searchState.language}
          languages={languages}
          onSortChange={(value) => updateParams({ sort: value }, true)}
          onOrderChange={(value) => updateParams({ order: value }, true)}
          onLanguageChange={(value) => updateParams({ language: value }, true)}
          onForksChange={(include) =>
            updateParams({ forks: include ? 'include' : 'exclude' }, true)
          }
        />
        <div className="status">
          <span>
            {data
              ? `${data.totalCount.toLocaleString()} repositories • Page ${searchState.page} of ${totalPages}`
              : 'Start typing to search GitHub repositories.'}
          </span>
          {isFetching && <span className="pill subtle">Loading…</span>}
        </div>
      </section>

      {errorMessage ? (
        <div className="card error-card" role="alert">
          <p className="error-title">Request failed</p>
          <p>{errorMessage}</p>
          {showRateLimit && (
            <p className="secondary">
              GitHub limits unauthenticated requests. Configure a token on Cloudflare to increase
              your allowance.
            </p>
          )}
          <button type="button" className="button secondary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="card empty-state">
          <p className="empty-title">No repositories found</p>
          <p className="secondary">Try another keyword or loosen your filters.</p>
        </div>
      ) : null}

      <section className="grid" aria-live="polite">
        {data
          ? data.items.map((repo) => <RepoCard key={repo.id} repo={repo} />)
          : null}
        {isFetching && !data
          ? Array.from({ length: 6 }).map((_, index) => <RepoSkeleton key={index} />)
          : null}
      </section>

      {data && data.totalCount >= 1000 ? (
        <div className="card notice">
          Showing the first 1,000 results due to GitHub search limits.
        </div>
      ) : null}

      <Pagination currentPage={searchState.page} totalPages={totalPages} onPageChange={handlePageChange} />
    </main>
  )
}
