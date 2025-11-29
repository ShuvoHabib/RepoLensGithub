import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from '../components/Pagination'
import { renderWithProviders } from '../test-utils'

describe('Pagination', () => {
  it('calls onPageChange for prev/next and specific pages', async () => {
    const onPageChange = vi.fn()

    renderWithProviders(
      <Pagination currentPage={2} totalPages={4} onPageChange={onPageChange} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /previous page/i }))
    await userEvent.click(screen.getByRole('button', { name: /next page/i }))
    await userEvent.click(screen.getByRole('button', { name: '3' }))

    expect(onPageChange).toHaveBeenCalledWith(1)
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})
