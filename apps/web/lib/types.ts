/**
 * Re-export the canonical types from the shared workspace package so all
 * web imports of `@/lib/types` resolve to the same definitions used by the
 * mobile app.
 */
export * from "@wadl/shared/types";
