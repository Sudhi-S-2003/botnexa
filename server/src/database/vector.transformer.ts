import pgvector from 'pgvector';
import { ValueTransformer } from 'typeorm';

export const VectorTransformer: ValueTransformer = {
  to(value?: number[] | null): string | null {
    if (!value || !Array.isArray(value) || value.length === 0) {
      return null;
    }
    return pgvector.toSql(value);
  },
  from(value?: string | number[] | null): number[] | null {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return value;
    }
    const parsed = pgvector.fromSql(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  },
};
