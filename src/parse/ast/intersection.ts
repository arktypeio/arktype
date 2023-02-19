import type { DisjointsByPath } from "../../nodes/compose.ts"
import { disjointDescriptionWriters } from "../../nodes/compose.ts"
import type { MappedKeys } from "../../nodes/rules/props.ts"
import type {
    asConst,
    Dict,
    error,
    evaluate,
    extractValues,
    isAny,
    List,
    stringKeyOf,
    tryCatch
} from "../../utils/generics.ts"
import { objectKeysOf } from "../../utils/generics.ts"
import type { Path, pathToString } from "../../utils/paths.ts"
import type { ParsedMorph } from "./morph.ts"

export type inferIntersection<l, r> = inferIntersectionRecurse<l, r, []>

type inferIntersectionRecurse<
    l,
    r,
    path extends string[]
> = path["length"] extends 10
    ? l & r
    : l extends never
    ? never
    : r extends never
    ? never
    : l & r extends never
    ? error<writeImplicitNeverMessage<path, "Intersection">>
    : isAny<l | r> extends true
    ? any
    : l extends ParsedMorph<infer lIn, infer lOut>
    ? r extends ParsedMorph
        ? error<writeImplicitNeverMessage<path, "Intersection", "of morphs">>
        : (In: evaluate<lIn & r>) => lOut
    : r extends ParsedMorph<infer rIn, infer rOut>
    ? (In: evaluate<rIn & l>) => rOut
    : [l, r] extends [Dict, Dict]
    ? bubblePropErrors<
          evaluate<
              {
                  [k in stringKeyOf<l>]: k extends keyof r
                      ? inferIntersectionRecurse<l[k], r[k], [...path, k]>
                      : l[k]
              } & Omit<r, keyof l>
          >
      >
    : [l, r] extends [List<infer lItem>, List<infer rItem>]
    ? inferIntersectionRecurse<
          lItem,
          rItem,
          [...path, MappedKeys["index"]]
      > extends infer result
        ? tryCatch<result, result[]>
        : never
    : l & r

type bubblePropErrors<o> = extractValues<o, error> extends never
    ? o
    : extractValues<o, error>

export const compileDisjointReasonsMessage = (disjoints: DisjointsByPath) => {
    const paths = objectKeysOf(disjoints)
    if (paths.length === 1) {
        const path = paths[0]
        return `${
            path === "/" ? "" : `At ${path}: `
        }Intersection of ${disjointDescriptionWriters[disjoints[path].kind](
            disjoints[path] as never
        )} results in an unsatisfiable type`
    }
    let message = `
        "Intersection results in unsatisfiable types at the following paths:\n`
    for (const path in disjoints) {
        message += `  ${path}: ${disjointDescriptionWriters[
            disjoints[path].kind
        ](disjoints[path] as never)}\n`
    }
    return message
}

export const writeImplicitNeverMessage = <
    path extends Path | [],
    operator extends "Intersection" | "keyof",
    description extends string = ""
>(
    path: asConst<path>,
    operator: operator,
    description?: description
) =>
    `${path.length ? `At ${path}: ` : ""}${operator} ${
        description ? `${description} ` : ""
    }results in an unsatisfiable type` as writeImplicitNeverMessage<
        path,
        operator,
        description
    >

export type writeImplicitNeverMessage<
    path extends string[],
    operator extends "Intersection" | "keyof",
    description extends string = ""
> = `${path extends []
    ? ""
    : `At ${pathToString<path>}: `}${operator} ${description extends ""
    ? ""
    : `${description} `}results in an unsatisfiable type`
