import type { OrderOption, SortOption } from '../api/types'

interface FiltersProps {
  sort: SortOption
  order: OrderOption
  includeForks: boolean
  language?: string
  languages: string[]
  onSortChange: (value: SortOption) => void
  onOrderChange: (value: OrderOption) => void
  onLanguageChange: (value?: string) => void
  onForksChange: (include: boolean) => void
}

export function Filters({
  sort,
  order,
  includeForks,
  language,
  languages,
  onSortChange,
  onOrderChange,
  onLanguageChange,
  onForksChange,
}: FiltersProps) {
  const uniqueLanguages = ['all', ...languages]
  const isBestMatch = sort === 'best'

  return (
    <div className="filters">
      <div className="field">
        <label htmlFor="sort">Sort</label>
        <select
          id="sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
        >
          <option value="best">Best match</option>
          <option value="stars">Stars</option>
          <option value="updated">Last updated</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="order">Order</label>
        <select
          id="order"
          value={order}
          disabled={isBestMatch}
          onChange={(event) => onOrderChange(event.target.value as OrderOption)}
          title={isBestMatch ? 'Ordering is handled by GitHub for best match' : undefined}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="language">Language</label>
        <select
          id="language"
          value={language ?? 'all'}
          onChange={(event) => {
            const next = event.target.value
            onLanguageChange(next === 'all' ? undefined : next)
          }}
        >
          {uniqueLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {lang === 'all' ? 'All languages' : lang}
            </option>
          ))}
        </select>
      </div>

      <div className="field checkbox-field">
        <input
          id="forks-toggle"
          type="checkbox"
          checked={includeForks}
          onChange={(event) => onForksChange(event.target.checked)}
        />
        <label htmlFor="forks-toggle">Include forks</label>
      </div>
    </div>
  )
}
