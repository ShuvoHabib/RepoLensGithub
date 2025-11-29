import { z } from 'zod'

const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Query is required')
    .max(120, 'Query is too long')
    .transform((value) => value.replace(/\s+/g, ' ')),
  page: z.coerce.number().int().min(1).max(100).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['best', 'stars', 'updated']).default('best'),
  order: z.enum(['asc', 'desc']).default('desc'),
  language: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value?.replace(/[<>]/g, '')),
  forks: z.enum(['include', 'exclude']).default('exclude'),
})

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories'

type Env = {
  GITHUB_TOKEN?: string
}

export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const url = new URL(request.url)
  const parsed = searchSchema.safeParse(Object.fromEntries(Array.from(url.searchParams.entries())))

  if (!parsed.success) {
    return jsonResponse(
      {
        error: 'Invalid search parameters',
        details: parsed.error.issues.map((issue) => issue.message),
      },
      400,
    )
  }

  const { q, page, per_page, sort, order, language, forks } = parsed.data

  const sanitizedQuery = q.replace(/[^\p{L}\p{N}\s\-_.:+/]/gu, '').trim()

  if (!sanitizedQuery) {
    return jsonResponse({ error: 'Query cannot be empty' }, 400)
  }

  const qualifiers = [`fork:${forks === 'include' ? 'true' : 'false'}`]
  if (language) qualifiers.push(`language:${language}`)
  const fullQuery = [sanitizedQuery, ...qualifiers].join(' ').trim()

  const searchParams = new URLSearchParams({
    q: fullQuery,
    page: String(page),
    per_page: String(per_page),
  })

  if (sort !== 'best') {
    searchParams.set('sort', sort)
    searchParams.set('order', order)
  }

  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-search-cloudflare',
  }

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`
  }

  let githubResponse: Response
  try {
    githubResponse = await fetch(`${GITHUB_SEARCH_URL}?${searchParams.toString()}`, {
      headers,
    })
  } catch (error) {
    logError('Network error', error)
    return jsonResponse({ error: 'Unable to reach GitHub right now.' }, 502)
  }

  const rateReset = githubResponse.headers.get('x-ratelimit-reset')
  const remaining = githubResponse.headers.get('x-ratelimit-remaining')

  if (remaining === '0') {
    return jsonResponse(
      {
        error: 'GitHub rate limit hit. Please retry after cooldown.',
        resetAt: rateReset ? Number.parseInt(rateReset, 10) : undefined,
      },
      429,
      {
        'Retry-After': githubResponse.headers.get('retry-after') ?? '60',
      },
    )
  }

  let payload: unknown
  try {
    payload = await githubResponse.json()
  } catch (error) {
    logError('Failed to parse GitHub response', error)
    return jsonResponse({ error: 'Unexpected response from GitHub.' }, 502)
  }

  if (!githubResponse.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'GitHub search failed.'
    return jsonResponse({ error: message }, githubResponse.status)
  }

  const safePayload = coerceGithubResponse(payload)
  if (!safePayload) {
    return jsonResponse({ error: 'Unexpected data from GitHub.' }, 502)
  }

  waitUntil(logRequest(url.toString(), githubResponse.status))

  return jsonResponse(
    {
      total_count: safePayload.total_count,
      incomplete_results: safePayload.incomplete_results,
      items: safePayload.items.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
          html_url: repo.owner.html_url,
        },
      })),
    },
    200,
    {
      'Cache-Control': 'private, max-age=60',
      'x-ratelimit-reset': rateReset ?? '',
    },
  )
}

const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string().url(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  updated_at: z.string(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string().url(),
    html_url: z.string().url(),
  }),
})

const githubResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(repositorySchema),
})

type GithubResponse = z.infer<typeof githubResponseSchema>

function coerceGithubResponse(payload: unknown): GithubResponse | null {
  const parsed = githubResponseSchema.safeParse(payload)
  if (!parsed.success) {
    logError('Validation failed for GitHub payload', parsed.error)
    return null
  }
  return parsed.data
}

function jsonResponse(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  })
}

async function logRequest(path: string, status: number) {
  console.log(JSON.stringify({ path, status, at: Date.now() }))
}

function logError(message: string, error: unknown) {
  console.error(message, typeof error === 'object' ? JSON.stringify(error) : error)
}
