import { Problems } from "./problems.js"
import { Scopes } from "./scopes.js"

export const initializeTraversal = (data: unknown): Traversal => ({
    data,
    path: [],
    branchPath: [],
    errors: new Problems(),
    checkedDataByAlias: {},
    scopes: new Scopes()
})

export type Traversal<Data = unknown> = {
    data: Data
    path: string[]
    branchPath: string[]
    errors: Problems
    checkedDataByAlias: Record<string, unknown[]>
    scopes: Scopes
}
