import type { conform } from "./generics.js"
import type { join } from "./lists.js"

export type stringifyUnion<t extends string> = join<unionToTuple<t>, ", ">

export type unionToTuple<t> = unionToTupleRecurse<t, []> extends infer result
    ? conform<result, t[]>
    : never

type unionToTupleRecurse<
    t,
    result extends unknown[]
> = getLastBranch<t> extends infer current
    ? [t] extends [never]
        ? result
        : unionToTupleRecurse<Exclude<t, current>, [current, ...result]>
    : never

type getLastBranch<t> = intersectUnion<
    t extends unknown ? (x: t) => void : never
> extends (x: infer branch) => void
    ? branch
    : never

export type intersectUnion<t> = (
    t extends unknown ? (_: t) => void : never
) extends (_: infer intersection) => void
    ? intersection
    : never
