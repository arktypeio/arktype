import type { ScopeRoot } from "../../scope.js"
import type { Never } from "./degenerate.js"

export type IntersectFn<t> = (l: t, r: t, scope: ScopeRoot) => t | Never

export type PruneFn<t> = (
    branch: t,
    given: t,
    scope: ScopeRoot
) => t | undefined

export type CheckFn<data, attributes> = (
    data: data,
    attributes: attributes,
    scope: ScopeRoot
) => boolean
