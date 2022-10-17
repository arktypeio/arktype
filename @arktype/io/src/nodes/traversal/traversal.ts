import type { Keyword } from "../terminal/keyword/keyword.js"
import { Problems } from "./problems.js"
import { Scopes } from "./scopes.js"

export class TraversalState<Data = unknown> {
    path: string[] = []
    branchPath: string[] = []
    problems = new Problems()
    scopes = new Scopes()
    resolvedEntries: ResolvedEntry[] = []

    constructor(public data: Data) {}
}

// TODO: Test weak map perf
export type ResolvedEntry = [alias: string, data: unknown]

export type Properties = Partial<Record<Keyword.Definition, 1>>
