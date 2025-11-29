interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  return (
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      role="search"
      aria-label="Repository search"
    >
      <label className="visually-hidden" htmlFor="search-input">
        Search repositories
      </label>
      <input
        id="search-input"
        className="input"
        type="search"
        name="q"
        placeholder="Search GitHub repositories..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
      <button type="submit" className="button primary">
        Search
      </button>
    </form>
  )
}
