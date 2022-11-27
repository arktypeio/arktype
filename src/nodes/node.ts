import type { ScopeRoot } from "../scope.js"
import type { xor } from "../utils/generics.js"
import type { DegenerateNode, Never } from "./types/degenerate.js"
import type { LiteralOnlyAttributes } from "./types/literalOnly.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node = xor<TypeNode, DegenerateNode>

export type TypeNode = BranchableTypes &
    LiteralOnlyBranchableTypes &
    BinaryTypes

export type BranchableTypes = {
    readonly object?: true | ObjectAttributes | readonly ObjectAttributes[]
    readonly string?: true | StringAttributes | readonly StringAttributes[]
    readonly number?: true | NumberAttributes | readonly NumberAttributes[]
}

export type LiteralOnlyBranchableTypes = {
    readonly bigint?: true | LiteralOnlyAttributes<bigint>
    readonly boolean?: true | LiteralOnlyAttributes<boolean>
}

export type BinaryTypes = {
    readonly symbol?: true
    readonly null?: true
    readonly undefined?: true
}

export type NonTrivialTypeName =
    | keyof BranchableTypes
    | keyof LiteralOnlyBranchableTypes

export type IntersectionFn<t> = (l: t, r: t, scope: ScopeRoot) => t | Never

export type PruneFn<t> = (
    branch: t,
    given: t,
    scope: ScopeRoot
) => t | undefined | null
