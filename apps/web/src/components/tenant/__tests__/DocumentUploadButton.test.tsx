/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocumentUploadButton from '../DocumentUploadButton'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockRequestUploadAction = jest.fn()

jest.mock('@/lib/actions/document', () => ({
  requestUploadAction: (...args: readonly unknown[]) =>
    (mockRequestUploadAction as (...a: readonly unknown[]) => unknown)(...args),
}))

describe('DocumentUploadButton', () => {
  // eslint-disable-next-line functional/no-let
  let fetchSpy: jest.SpyInstance

  beforeAll(() => {
    // jsdom doesn't define fetch — define it so spyOn can intercept it
    // eslint-disable-next-line functional/immutable-data
    Object.defineProperty(globalThis, 'fetch', { value: jest.fn(), writable: true, configurable: true })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('renders an "Upload Document" button', () => {
    render(<DocumentUploadButton />)
    expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument()
  })

  it('shows a document type dropdown and file input after clicking the button', async () => {
    render(<DocumentUploadButton />)
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByLabelText(/file/i)).toBeInTheDocument()
  })

  it('shows loading state while uploading', async () => {
    mockRequestUploadAction.mockImplementation(() => new Promise<never>(() => undefined))

    render(<DocumentUploadButton />)
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }))

    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'GOVERNMENT_ID')

    const fileInput = screen.getByLabelText(/file/i)
    const fakeFile = new File(['hello'], 'test.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput, fakeFile)

    fireEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })
  })

  it('shows error message on failure', async () => {
    mockRequestUploadAction.mockResolvedValue({ error: 'File exceeds 10 MB limit.' })

    render(<DocumentUploadButton />)
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }))

    await userEvent.selectOptions(screen.getByRole('combobox'), 'GOVERNMENT_ID')
    await userEvent.upload(screen.getByLabelText(/file/i), new File(['hello'], 'test.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => {
      expect(screen.getByText(/file exceeds 10 mb limit/i)).toBeInTheDocument()
    })
  })

  it('calls router.refresh() after a successful upload', async () => {
    mockRequestUploadAction.mockResolvedValue({ uploadUrl: 'https://s3.example.com/presigned', documentId: 'doc-abc' })

    render(<DocumentUploadButton />)
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }))

    await userEvent.selectOptions(screen.getByRole('combobox'), 'GOVERNMENT_ID')
    await userEvent.upload(screen.getByLabelText(/file/i), new File(['hello'], 'test.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
