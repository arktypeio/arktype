import type { ScopeRoot } from "../../scope.js"
import type { record } from "../../utils/dataTypes.js"
import type { Never } from "./degenerate.js"

export type TypeOperations<data, attributes extends record> = {
    intersect: Intersection<attributes>
    subtract: Difference<attributes>
    check: Check<data, attributes>
}

type Intersection<t> = (l: t, r: t, scope: ScopeRoot) => t | Never

type Difference<t> = (l: t, r: t, scope: ScopeRoot) => t | undefined

type Check<data, attributes> = (
    data: data,
    attributes: attributes,
    scope: ScopeRoot
) => boolean
