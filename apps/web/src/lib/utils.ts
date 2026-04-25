import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

export const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(iso));

export const safeGet = <A, B>(
  either: E.Either<A, B>,
  fallback: B
): B =>
  pipe(
    either,
    E.getOrElse(() => fallback)
  );
