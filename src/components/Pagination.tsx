interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const createPageList = (current: number, total: number) => {
  const pages: number[] = []
  const windowSize = 5
  const start = Math.max(1, Math.min(current - 2, total - windowSize + 1))
  const end = Math.min(total, start + windowSize - 1)

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = createPageList(currentPage, totalPages)

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="button ghost"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ← Prev
      </button>

      <ol className="page-list">
        {pages.map((page) => (
          <li key={page}>
            <button
              type="button"
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
              aria-current={currentPage === page ? 'page' : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="button ghost"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  )
}
