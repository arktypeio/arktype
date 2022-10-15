import { Problems } from "./problems.js"
import { Scopes } from "./scopes.js"

export const initializeTraversalState = (data: unknown): TraversalState => ({
    data,
    path: [],
    branchPath: [],
    errors: new Problems(),
    scopes: new Scopes(),
    resolvedEntries: []
})

export type TraversalState<Data = unknown> = {
    data: Data
    path: string[]
    branchPath: string[]
    errors: Problems
    scopes: Scopes
    resolvedEntries: ResolvedEntry[]
}

// TODO: Test weak map perf
export type ResolvedEntry = [alias: string, data: unknown]
