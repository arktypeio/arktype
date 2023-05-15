import type { inferTypeInput } from "../../nodes/type.js"
import type { domainOf } from "../../utils/domains.js"
import type { error } from "../../utils/errors.js"
import type { equals, evaluate, isAny } from "../../utils/generics.js"
import type { List, Path, pathToString, Segments } from "../../utils/lists.js"
import type { objectKindOf } from "../../utils/objectKinds.js"
import type { InferredMorph, Out } from "./morph.js"

// type validateUnion<l, r> = isAny<l | r> extends true
//     ? undefined
//     : [l] extends [never]
//     ? undefined
//     : [r] extends [never]
//     ? undefined
//     : [inferTypeInput<l>, inferTypeInput<r>] extends [infer lIn, infer rIn]
//     ? [equals<l, lIn>, equals<r, rIn>] extends [true, true]
//         ? undefined
//         : discriminatable<lIn, rIn> extends true
//         ? undefined
//         : error<undiscriminatableMorphUnionMessage>
//     : never

type discriminatable<l, r> = discriminatableRecurse<l, r, []> extends never
    ? false
    : true

type discriminatableRecurse<
    l,
    r,
    path extends string[]
> = path["length"] extends 10
    ? never
    : l & r extends never
    ? path
    : domainOf<l> & domainOf<r> extends never
    ? path
    : objectKindOf<l> & objectKindOf<r> extends never
    ? path
    : [objectKindOf<l>, objectKindOf<r>] extends ["Object", "Object"]
    ? extractValues<
          {
              [k in requiredKeyOf<l>]: k extends requiredKeyOf<r>
                  ? discriminatableRecurse<l[k], r[k], [...path, k & string]>
                  : never
          },
          string[]
      >
    : never

type undiscriminatableMorphUnionMessage =
    `A union including one or more morphs must be discriminatable`

export type validateIntersection<l, r> = inferIntersectionRecurse<
    l,
    r,
    []
> extends infer result extends error
    ? result
    : undefined

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
    : l extends InferredMorph<infer lIn, infer lOut>
    ? r extends InferredMorph
        ? error<writeImplicitNeverMessage<path, "Intersection", "of morphs">>
        : (In: evaluate<lIn & r>) => Out<lOut>
    : r extends InferredMorph<infer rIn, infer rOut>
    ? (In: evaluate<rIn & l>) => Out<rOut>
    : [l, r] extends [infer lList extends List, infer rList extends List]
    ? inferArrayIntersection<lList, rList, path>
    : [l, r] extends [object, object]
    ? evaluate<
          {
              [k in keyof l]: k extends keyof r
                  ? inferIntersectionRecurse<l[k], r[k], [...path, k & string]>
                  : l[k]
          } & r
      >
    : l & r

type inferArrayIntersection<
    l extends List,
    r extends List,
    path extends string[]
> = isTuple<l> extends true
    ? isTuple<r> extends true
        ? l["length"] extends r["length"]
            ? inferTupleIntersection<l, r>
            : error<
                  writeImplicitNeverMessage<
                      path,
                      "Intersection",
                      `between tuples of length ${l["length"]} and ${r["length"]}`
                  >
              >
        : {
              [i in keyof l]: evaluate<l[i] & r[i & keyof r]>
          }
    : isTuple<r> extends true
    ? {
          [i in keyof r]: evaluate<l[i & keyof l] & r[i]>
      }
    : evaluate<l[number] & r[number]>[]

type inferTupleIntersection<
    l extends List,
    r extends List,
    result extends List = []
> = l extends [infer lHead, ...infer lTail]
    ? r extends [infer rHead, ...infer rTail]
        ? inferTupleIntersection<
              lTail,
              rTail,
              [...result, evaluate<lHead & rHead>]
          >
        : result
    : result

type isTuple<list extends List> = number extends list["length"] ? false : true

type bubblePropErrors<o> = extractValues<o, error> extends never
    ? o
    : extractValues<o, error>

export type writeImplicitNeverMessage<
    path extends Segments,
    operator extends "Intersection" | "keyof",
    description extends string = ""
> = `${path extends []
    ? ""
    : `At ${pathToString<path>}: `}${operator} ${description extends ""
    ? ""
    : `${description} `}results in an unsatisfiable type`

export type extractKeysWithValue<o, filter> = {
    [k in keyof o]: isAny<o[k]> extends true
        ? never
        : o[k] extends never
        ? never
        : o[k] extends filter
        ? k
        : never
}[keyof o]

export type extractValues<o, filter> = o[extractKeysWithValue<o, filter>]

export type requiredKeyOf<o> = {
    [k in keyof o]-?: o extends { [_ in k]-?: o[k] } ? k : never
}[keyof o]
