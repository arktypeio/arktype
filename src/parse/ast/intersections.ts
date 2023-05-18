import type { error } from "../../utils/errors.js"
import type { evaluate, isAny } from "../../utils/generics.js"
import type { List, pathToString, Segments } from "../../utils/lists.js"
import type { MorphAst, Out } from "./morph.js"

export type validateIntersection<l, r> = inferIntersectionRecurse<
    l,
    r,
    true,
    []
>

export type inferIntersection<l, r> = inferIntersectionRecurse<l, r, false, []>

type inferIntersectionRecurse<
    l,
    r,
    propagateErrors extends boolean,
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
    : l extends MorphAst<infer lIn, infer lOut>
    ? r extends MorphAst
        ? error<writeImplicitNeverMessage<path, "Intersection", "of morphs">>
        : (In: evaluate<lIn & r>) => Out<lOut>
    : r extends MorphAst<infer rIn, infer rOut>
    ? (In: evaluate<rIn & l>) => Out<rOut>
    : intersectObjects<l, r, propagateErrors, path> extends infer result
    ? propagateErrors extends true
        ? result[keyof result]
        : result
    : never

type intersectObjects<
    l,
    r,
    propagateErrors extends boolean,
    path extends string[]
    // for some reason if you do the list check within the extends check for
    // [object, object], the number of type instantiations increase drastically
> = [l, r] extends [infer lList extends List, infer rList extends List]
    ? inferArrayIntersection<lList, rList, propagateErrors, path>
    : [l, r] extends [object, object]
    ? evaluate<
          {
              [k in keyof l]: k extends keyof r
                  ? inferIntersectionRecurse<
                        l[k],
                        r[k],
                        propagateErrors,
                        [...path, k & string]
                    >
                  : l[k]
          } & r
      >
    : l & r

type inferArrayIntersection<
    l extends List,
    r extends List,
    propagateErrors extends boolean,
    path extends string[],
    result extends List = []
> = [l, r] extends [
    [infer lHead, ...infer lTail],
    [infer rHead, ...infer rTail]
]
    ? inferArrayIntersection<
          lTail,
          rTail,
          propagateErrors,
          path,
          [
              ...result,
              inferIntersectionRecurse<
                  lHead,
                  rHead,
                  propagateErrors,
                  [...path, `${result["length"]}`]
              >
          ]
      >
    : l extends [infer lHead, ...infer lTail]
    ? r extends []
        ? error<
              writeImplicitNeverMessage<
                  path,
                  "Intersection",
                  `between tuples of length ${result["length"]} and ${[
                      ...result,
                      ...l
                  ]["length"] &
                      string}`
              >
          >
        : inferArrayIntersection<
              lTail,
              r,
              propagateErrors,
              path,
              [
                  ...result,
                  inferIntersectionRecurse<
                      lHead,
                      r[number],
                      propagateErrors,
                      [...path, `${result["length"]}`]
                  >
              ]
          >
    : r extends [infer rHead, ...infer rTail]
    ? l extends []
        ? error<
              writeImplicitNeverMessage<
                  path,
                  "Intersection",
                  `between tuples of length ${result["length"]} and ${[
                      ...result,
                      ...r
                  ]["length"] &
                      string}`
              >
          >
        : inferArrayIntersection<
              l,
              rTail,
              propagateErrors,
              path,
              [
                  ...result,
                  inferIntersectionRecurse<
                      l[number],
                      rHead,
                      propagateErrors,
                      [...path, `${result["length"]}`]
                  >
              ]
          >
    : [number, number] extends [l["length"], r["length"]]
    ? [
          ...result,
          ...inferIntersectionRecurse<
              l[number],
              r[number],
              propagateErrors,
              [...path, `${number}`]
          >[]
      ]
    : result

export type writeImplicitNeverMessage<
    path extends Segments,
    operator extends "Intersection" | "keyof",
    description extends string = ""
> = `${path extends []
    ? ""
    : `At ${pathToString<path>}: `}${operator} ${description extends ""
    ? ""
    : `${description} `}results in an unsatisfiable type`

export type requiredKeyOf<o> = {
    [k in keyof o]-?: o extends { [_ in k]-?: o[k] } ? k : never
}[keyof o]
