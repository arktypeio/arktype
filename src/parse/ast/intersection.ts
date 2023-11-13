import type { DisjointsByPath } from "../../nodes/compose.js"
import { disjointDescriptionWriters } from "../../nodes/compose.js"
import type { asConst, evaluate, isAny, List } from "../../utils/generics.js"
import { objectKeysOf } from "../../utils/generics.js"
import type { Path, pathToString } from "../../utils/paths.js"
import type { Out, ParsedMorph } from "./morph.js"

export type inferIntersection<l, r> = [l] extends [never]
    ? never
    : [r] extends [never]
    ? never
    : [l & r] extends [never]
    ? never
    : isAny<l | r> extends true
    ? any
    : l extends ParsedMorph<infer lIn, infer lOut>
    ? r extends ParsedMorph
        ? never
        : (In: evaluate<lIn & r>) => Out<lOut>
    : r extends ParsedMorph<infer rIn, infer rOut>
    ? (In: evaluate<rIn & l>) => Out<rOut>
    : intersectObjects<l, r> extends infer result
    ? result
    : never

type intersectObjects<l, r> = [l, r] extends [object, object]
    ? [l, r] extends [infer lList extends List, infer rList extends List]
        ? inferArrayIntersection<lList, rList>
        : evaluate<
              {
                  [k in keyof l]: k extends keyof r
                      ? inferIntersection<l[k], r[k]>
                      : l[k]
              } & Omit<r, keyof l>
          >
    : l & r

type inferArrayIntersection<
    l extends List,
    r extends List,
    result extends List = []
> = [l, r] extends [
    [infer lHead, ...infer lTail],
    [infer rHead, ...infer rTail]
]
    ? inferArrayIntersection<
          lTail,
          rTail,
          [...result, inferIntersection<lHead, rHead>]
      >
    : l extends [infer lHead, ...infer lTail]
    ? r extends []
        ? // l is longer tuple than r, unsatisfiable
          never
        : inferArrayIntersection<
              lTail,
              r,
              [...result, inferIntersection<lHead, r[number]>]
          >
    : r extends [infer rHead, ...infer rTail]
    ? l extends []
        ? // r is longer tuple than l, unsatisfiable
          never
        : inferArrayIntersection<
              l,
              rTail,
              [...result, inferIntersection<l[number], rHead>]
          >
    : [number, number] extends [l["length"], r["length"]]
    ? [...result, ...inferIntersection<l[number], r[number]>[]]
    : result

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
