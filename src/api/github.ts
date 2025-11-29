import { ApiError } from './types'
import type { SearchRequest, SearchResponse } from './types'

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories'
export const SEARCH_RESULT_CAP = 1000
const MAX_QUERY_LENGTH = 120

type GithubSearchApiResponse = {
  total_count: number
  incomplete_results: boolean
  items: Array<{
    id: number
    name: string
    full_name: string
    description: string | null
    html_url: string
    language: string | null
    stargazers_count: number
    forks_count: number
    updated_at: string
    owner: {
      login: string
      avatar_url: string
      html_url: string
    }
  }>
}

export const sanitizeQuery = (value: string) =>
  value.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)

const buildSearchParams = (params: SearchRequest) => {
  const sanitizedQuery = sanitizeQuery(params.query)
  const searchParams = new URLSearchParams()

  if (!sanitizedQuery) {
    throw new ApiError('Search query is required', 400)
  }

  const qualifiers: string[] = []
  if (!params.useProxy) {
    if (params.language) qualifiers.push(`language:${params.language}`)
    qualifiers.push(`fork:${params.includeForks ? 'true' : 'false'}`)
  }

  const q = [sanitizedQuery, ...qualifiers].join(' ').trim()

  searchParams.set('q', q)
  searchParams.set('page', String(params.page))
  searchParams.set('per_page', String(params.perPage))

  if (params.sort !== 'best') {
    searchParams.set('sort', params.sort)
    searchParams.set('order', params.order)
  } else if (params.order && params.order !== 'desc') {
    searchParams.set('order', params.order)
  }

  if (params.useProxy) {
    searchParams.set('forks', params.includeForks ? 'include' : 'exclude')
    if (params.language) {
      searchParams.set('language', params.language)
    }
  }

  return { searchParams, sanitizedQuery }
}

export async function searchRepositories(params: SearchRequest): Promise<SearchResponse> {
  const { searchParams } = buildSearchParams(params)
  const endpoint = params.useProxy
    ? `/search?${searchParams.toString()}`
    : `${GITHUB_SEARCH_URL}?${searchParams.toString()}`

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  const retryAfterHeader = response.headers.get('retry-after')
  const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined
  const rateLimitResetHeader = response.headers.get('x-ratelimit-reset')
  const rateLimitReset = rateLimitResetHeader ? Number.parseInt(rateLimitResetHeader, 10) : undefined

  if (!response.ok) {
    let message = 'Failed to reach GitHub'
    let details: string | undefined
    try {
      const data = (await response.json()) as { message?: string }
      details = data.message
      if (data.message) {
        message = data.message
      }
    } catch {
      // ignore parse error
    }

    if (response.status === 403) {
      message = 'GitHub rate limit reached. Try again shortly.'
    }

    throw new ApiError(message, response.status, details, retryAfter ?? rateLimitReset)
  }

  const body = (await response.json()) as GithubSearchApiResponse

  const items = body.items ?? []
  const languages = Array.from(
    new Set(items.map((repo) => repo.language).filter(Boolean) as string[]),
  )

  return {
    items,
    totalCount: Math.min(body.total_count, SEARCH_RESULT_CAP),
    incompleteResults: body.incomplete_results,
    rateLimitReset,
    languages,
  }
}
