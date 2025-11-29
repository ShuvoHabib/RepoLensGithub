export type SortOption = 'best' | 'stars' | 'updated'
export type OrderOption = 'asc' | 'desc'

export interface GithubOwner {
  login: string
  avatar_url: string
  html_url: string
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  owner: GithubOwner
}

export interface SearchResponse {
  items: GithubRepo[]
  totalCount: number
  incompleteResults: boolean
  rateLimitReset?: number
  languages: string[]
}

export interface SearchRequest {
  query: string
  page: number
  perPage: number
  sort: SortOption
  order: OrderOption
  includeForks: boolean
  language?: string
  useProxy: boolean
}

export class ApiError extends Error {
  status: number
  details?: string
  retryAfter?: number

  constructor(message: string, status: number, details?: string, retryAfter?: number) {
    super(message)
    this.status = status
    this.details = details
    this.retryAfter = retryAfter
  }
}
