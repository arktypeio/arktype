import type { ScopeRoot } from "../scope.js"
import type { xor } from "../utils/generics.js"
import type { BigintAttributes } from "./types/bigint.js"
import type { BooleanAttributes } from "./types/boolean.js"
import type { DegenerateNode } from "./types/degenerate.js"
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

export type TrivialTypes = {
    readonly symbol?: true
    readonly null?: true
    readonly undefined?: true
}
