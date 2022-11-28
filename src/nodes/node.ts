import type { ScopeRoot } from "../scope.js"
import type { xor } from "../utils/generics.js"
import type { DegenerateNode, Never } from "./types/degenerate.js"
import type {
    BigintAttributes,
    BooleanAttributes
} from "./types/literalOnly.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node = xor<TypeNode, DegenerateNode>

export type TypeNode = NonTrivialTypes & TrivialTypes

export type NonTrivialTypes = {
    readonly object?: true | ObjectAttributes | readonly ObjectAttributes[]
    readonly string?: true | StringAttributes | readonly StringAttributes[]
    readonly number?: true | NumberAttributes | readonly NumberAttributes[]
    readonly bigint?: true | BigintAttributes | readonly BigintAttributes[]
    readonly boolean?: true | BooleanAttributes
}

export type NonTrivialTypeName = keyof NonTrivialTypes

export type TrivialTypes = {
    readonly symbol?: true
    readonly null?: true
    readonly undefined?: true
}

export type IntersectionFn<t> = (l: t, r: t) => t | Never

export type ScopedIntersectionFn<t> = (
    l: t,
    r: t,
    scope: ScopeRoot
) => t | Never

export type PruneFn<t> = (branch: t, given: t) => t | undefined | null

export type ScopedPruneFn<t> = (
    branch: t,
    given: t,
    scope: ScopeRoot
) => t | undefined | null
