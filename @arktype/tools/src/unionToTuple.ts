import type { Conform, IntersectionOf } from "./common.js"

type GetLastUnionMember<T> = IntersectionOf<
    T extends unknown ? (t: T) => void : never
> extends (t: infer Next) => void
    ? Next
    : never

type UnionToTupleRecurse<
    Union,
    Result extends unknown[],
    Current = GetLastUnionMember<Union>
> = [Union] extends [never]
    ? Result
    : UnionToTupleRecurse<Exclude<Union, Current>, [Current, ...Result]>

export type UnionToTuple<Union> = UnionToTupleRecurse<Union, []> extends infer X
    ? Conform<X, Union[]>
    : never
