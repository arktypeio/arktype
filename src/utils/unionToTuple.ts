import type { conform } from "./generics.js"
import type { join } from "./paths.js"

export type stringifyUnion<t extends string> = join<unionToTuple<t>, ", ">

export type unionToTuple<t> = unionToTupleRecurse<t, []> extends infer result
    ? conform<result, t[]>
    : never

type unionToTupleRecurse<
    t,
    result extends unknown[]
> = getLastBranch<t> extends infer current
    ? {
          0: unionToTupleRecurse<Exclude<t, current>, [current, ...result]>
          1: result
      }[[t] extends [never] ? 1 : 0]
    : never

type getLastBranch<t> = intersectUnion<
    t extends unknown ? (x: t) => void : never
> extends (x: infer branch) => void
    ? branch
    : never

type intersectUnion<t> = (t extends unknown ? (k: t) => void : never) extends (
    k: infer intersection
) => void
    ? intersection
    : never
