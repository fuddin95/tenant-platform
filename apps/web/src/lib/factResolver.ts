import type { DocumentType, FactCategory } from '@rental-trust/database'

const FACT_TO_DOC_TYPES: Record<FactCategory, readonly DocumentType[]> = {
  IDENTITY:       ['GOVERNMENT_ID'],
  INCOME:         ['PROOF_OF_INCOME', 'PAY_STUB', 'EMPLOYMENT_LETTER'],
  RENTAL_HISTORY: [],
  REFERENCES:     ['REFERENCE_CONTACT'],
  CREDIT:         ['CREDIT_REPORT'],
}

export function resolveFactsToDocTypes(facts: readonly FactCategory[]): readonly DocumentType[] {
  return [...new Set(facts.flatMap(f => FACT_TO_DOC_TYPES[f]))]
}
