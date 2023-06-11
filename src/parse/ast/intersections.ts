import type { error } from "../../../dev/utils/errors.ts"
import type { evaluate, isAny } from "../../../dev/utils/generics.ts"
import type { List, pathToString } from "../../../dev/utils/lists.ts"
import type { MorphAst, Out } from "./morph.js"

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
    : l extends MorphAst<infer lIn, infer lOut>
    ? r extends MorphAst
    ? error<writeImplicitNeverMessage<path, "Intersection", "of morphs">>
    : (In: evaluate<lIn & r>) => Out<lOut>
    : r extends MorphAst<infer rIn, infer rOut>
    ? (In: evaluate<rIn & l>) => Out<rOut>
    : intersectObjects<l, r, path> extends infer result
    ? result
    : never

type intersectObjects<
    l,
    r,
    path extends string[]
// for some reason if you do the list check within the extends check for
// [object, object], the number of type instantiations increase drastically
> = [l, r] extends [infer lList extends List, infer rList extends List]
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
    path extends string[],
    result extends List = []
> = [l, r] extends [
    [infer lHead, ...infer lTail],
    [infer rHead, ...infer rTail]
]
    ? inferArrayIntersection<
        lTail,
        rTail,
        path,
        [
            ...result,
            inferIntersectionRecurse<
                lHead,
                rHead,
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
        path,
        [
            ...result,
            inferIntersectionRecurse<
                lHead,
                r[number],
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
        path,
        [
            ...result,
            inferIntersectionRecurse<
                l[number],
                rHead,
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
            [...path, `${number}`]
        >[]
    ]
    : result

export type writeImplicitNeverMessage<
    path extends string[],
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
