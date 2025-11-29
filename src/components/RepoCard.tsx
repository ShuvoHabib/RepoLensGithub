import type { GithubRepo } from '../api/types'

interface RepoCardProps {
  repo: GithubRepo
}

const formatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

export function RepoCard({ repo }: RepoCardProps) {
  return (
    <article className="repo-card">
      <header className="repo-card__header">
        <div className="owner">
          <img src={repo.owner.avatar_url} alt={`${repo.owner.login} avatar`} />
          <div>
            <p className="owner__name">{repo.owner.login}</p>
            <a
              className="repo-card__title"
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${repo.full_name} on GitHub`}
            >
              {repo.name}
            </a>
          </div>
        </div>
        <span className="language badge">{repo.language ?? 'N/A'}</span>
      </header>

      <p className="description">{repo.description ?? 'No description provided.'}</p>

      <footer className="repo-card__footer">
        <div className="meta">
          <span className="pill">⭐ {repo.stargazers_count.toLocaleString()}</span>
          <span className="pill">🍴 {repo.forks_count.toLocaleString()}</span>
        </div>
        <div className="meta secondary">
          <span>Updated {formatter.format(new Date(repo.updated_at))}</span>
        </div>
      </footer>
    </article>
  )
}
