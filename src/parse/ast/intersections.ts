import type { extractIn, extractOut } from "../../type.js"
import type { domainOf } from "../../utils/domains.js"
import type { error } from "../../utils/errors.js"
import type { equals, evaluate, isAny } from "../../utils/generics.js"
import type { List, pathToString, Segments } from "../../utils/lists.js"
import type { objectKindOf } from "../../utils/objectKinds.js"
import type { InferredMorph, Out } from "./morph.js"

export type validateUnion<l, r> = isAny<l | r> extends true
    ? undefined
    : [l] extends [never]
    ? undefined
    : [r] extends [never]
    ? undefined
    : [extractIn<l>, extractOut<r>] extends [infer lIn, infer rIn]
    ? [equals<l, lIn>, equals<r, rIn>] extends [true, true]
        ? undefined
        : findDiscriminant<lIn, rIn, []> extends string[]
        ? undefined
        : error<undiscriminatableMorphUnionMessage>
    : never

type findDiscriminant<l, r, path extends string[]> = path["length"] extends 5
    ? undefined
    : l & r extends never
    ? path
    : domainOf<l> & domainOf<r> extends never
    ? path
    : objectKindOf<l> & objectKindOf<r> extends never
    ? path
    : [objectKindOf<l>, objectKindOf<r>] extends ["Object", "Object"]
    ? {
          [k in requiredKeyOf<l>]: k extends requiredKeyOf<r>
              ? findDiscriminant<l[k], r[k], [...path, k & string]>
              : undefined
      }[requiredKeyOf<l>]
    : undefined

type undiscriminatableMorphUnionMessage =
    `A union including one or more morphs must be discriminatable`

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
    : l extends InferredMorph<infer lIn, infer lOut>
    ? r extends InferredMorph
        ? error<writeImplicitNeverMessage<path, "Intersection", "of morphs">>
        : (In: evaluate<lIn & r>) => Out<lOut>
    : r extends InferredMorph<infer rIn, infer rOut>
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
> = [l, r] extends [infer lList extends List, infer rList extends List]
    ? inferArrayIntersection<lList, rList, propagateErrors, path>
    : [l, r] extends [object, object]
    ? {
          [k in keyof l]: k extends keyof r
              ? inferIntersectionRecurse<
                    l[k],
                    r[k],
                    propagateErrors,
                    [...path, k & string]
                >
              : l[k]
      } & r
    : l & r

type inferArrayIntersection<
    l extends List,
    r extends List,
    propagateErrors extends boolean,
    path extends string[]
> = isTuple<l> extends true
    ? isTuple<r> extends true
        ? l["length"] extends r["length"]
            ? inferTupleIntersection<l, r, propagateErrors, path>
            : error<
                  writeImplicitNeverMessage<
                      path,
                      "Intersection",
                      `between tuples of length ${l["length"]} and ${r["length"]}`
                  >
              >
        : {
              [i in keyof l]: inferIntersectionRecurse<
                  l[i],
                  r[i & keyof r],
                  propagateErrors,
                  [...path, `${i}`]
              >
          }
    : isTuple<r> extends true
    ? {
          [i in keyof r]: inferIntersectionRecurse<
              r[i],
              l[i & keyof l],
              propagateErrors,
              [...path, `${i}`]
          >
      }
    : inferIntersectionRecurse<
          l[number],
          r[number],
          propagateErrors,
          [...path, `${number}`]
      >[]

type inferTupleIntersection<
    l extends List,
    r extends List,
    propagateErrors extends boolean,
    path extends string[],
    result extends List = []
> = l extends [infer lHead, ...infer lTail]
    ? r extends [infer rHead, ...infer rTail]
        ? inferTupleIntersection<
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
        : result
    : result

type isTuple<list extends List> = number extends list["length"] ? false : true

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
