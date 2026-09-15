// ============================================================================
// Repository Layer Boundary
// Repositories are responsible for data access (PostGIS / PostgreSQL queries).
// Controllers and Services must not execute direct SQL queries.
// ============================================================================

export interface BaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: unknown): Promise<T[]>;
}
