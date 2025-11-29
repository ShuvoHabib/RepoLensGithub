import { useQuery } from '@tanstack/react-query'
import { searchRepositories, SEARCH_RESULT_CAP, sanitizeQuery } from '../api/github'
import type { OrderOption, SearchResponse, SortOption } from '../api/types'

export const RESULTS_PER_PAGE = 10

export interface UseSearchReposParams {
  query: string
  page: number
  sort: SortOption
  order: OrderOption
  includeForks: boolean
  language?: string
  useProxy: boolean
}

export function useSearchRepos(params: UseSearchReposParams) {
  const perPage = RESULTS_PER_PAGE
  const normalizedQuery = sanitizeQuery(params.query)

  return useQuery<SearchResponse>({
    queryKey: [
      'search',
      {
        normalizedQuery,
        page: params.page,
        perPage,
        sort: params.sort,
        order: params.order,
        includeForks: params.includeForks,
        language: params.language ?? '',
        useProxy: params.useProxy,
      },
    ],
    queryFn: () => searchRepositories({ ...params, query: normalizedQuery, perPage }),
    enabled: normalizedQuery.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 403) {
        return false
      }
      return failureCount < 2
    },
  })
}

export const getEffectiveTotalPages = (totalCount: number) =>
  Math.max(1, Math.ceil(Math.min(totalCount, SEARCH_RESULT_CAP) / RESULTS_PER_PAGE))
