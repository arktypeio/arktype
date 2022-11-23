import type { DynamicTypeName } from "../utils/dynamicTypes.js"
import type { evaluate, xor } from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { NumberAttributes } from "./number.js"
import type { ObjectAttributes } from "./object.js"
import type { StringAttributes } from "./string.js"

export type TypeNode = xor<TypeCases, DegenerateType>

export type TypeCases = {
    readonly bigint?: true | readonly IntegerLiteral[]
    readonly boolean?: true | readonly [boolean]
    readonly number?: true | readonly number[] | NumberAttributes
    readonly object?: true | ObjectAttributes
    readonly string?: true | readonly string[] | StringAttributes
    readonly symbol?: true
    readonly undefined?: true
    readonly null?: true
}

export type TypeName = evaluate<keyof TypeCases>

export type DegenerateType = UnresolvableDegenerateType | Alias

export type UnresolvableDegenerateType = Never | Any | Unknown

export type Never = { degenerate: "never"; reason: string }

export type Any = { degenerate: "any" }

export type Unknown = { degenerate: "unknown" }

export type Alias = { degenerate: "alias"; name: string }

export type Branches = UnionBranches | IntersectedUnions

export type UnionBranches = UndiscriminatedUnion | DiscriminatedUnion

export type UndiscriminatedUnion = readonly [token: "|", members: TypeNode[]]

export type IntersectedUnions = readonly [token: "&", members: UnionBranches[]]

export type DiscriminatedUnion = readonly [
    token: "?",
    path: string,
    cases: DiscriminatedCases
]

type DiscriminatedCases = {
    readonly [k in DynamicTypeName]?: TypeNode
}
