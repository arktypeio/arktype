/**
 * Note: Similarly to Narrow, trying to Evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 *
 */
export type Evaluate<T> = {
    [K in keyof T]: T[K]
} & unknown

export type EvaluateFunction<F> = F extends Function ? F : never
