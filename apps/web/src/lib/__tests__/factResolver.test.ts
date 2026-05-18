import { resolveFactsToDocTypes } from '../factResolver'

describe('resolveFactsToDocTypes', () => {
  it('maps IDENTITY to GOVERNMENT_ID', () => {
    expect(resolveFactsToDocTypes(['IDENTITY'])).toEqual(['GOVERNMENT_ID'])
  })

  it('maps INCOME to three document types', () => {
    expect(resolveFactsToDocTypes(['INCOME'])).toEqual([
      'PROOF_OF_INCOME',
      'PAY_STUB',
      'EMPLOYMENT_LETTER',
    ])
  })

  it('maps RENTAL_HISTORY to empty array (no DocumentType yet)', () => {
    expect(resolveFactsToDocTypes(['RENTAL_HISTORY'])).toEqual([])
  })

  it('maps REFERENCES to REFERENCE_CONTACT', () => {
    expect(resolveFactsToDocTypes(['REFERENCES'])).toEqual(['REFERENCE_CONTACT'])
  })

  it('maps CREDIT to CREDIT_REPORT', () => {
    expect(resolveFactsToDocTypes(['CREDIT'])).toEqual(['CREDIT_REPORT'])
  })

  it('handles multiple facts and deduplicates overlapping doc types', () => {
    const result = resolveFactsToDocTypes(['IDENTITY', 'CREDIT'])
    expect(result).toEqual(['GOVERNMENT_ID', 'CREDIT_REPORT'])
  })

  it('handles empty array', () => {
    expect(resolveFactsToDocTypes([])).toEqual([])
  })

  it('handles all facts combined', () => {
    const result = resolveFactsToDocTypes([
      'IDENTITY',
      'INCOME',
      'RENTAL_HISTORY',
      'REFERENCES',
      'CREDIT',
    ])
    expect(result).toContain('GOVERNMENT_ID')
    expect(result).toContain('PROOF_OF_INCOME')
    expect(result).toContain('PAY_STUB')
    expect(result).toContain('EMPLOYMENT_LETTER')
    expect(result).toContain('REFERENCE_CONTACT')
    expect(result).toContain('CREDIT_REPORT')
    // No duplicates
    expect(new Set(result).size).toBe(result.length)
  })
})
