import type { DisjointsByPath } from "../../nodes/compose.ts"
import { disjointDescriptionWriters } from "../../nodes/compose.ts"
import type { resolve } from "../../scopes/scope.ts"
import type { asIn } from "../../scopes/type.ts"
import type { domainOf } from "../../utils/domains.ts"
import type {
    asConst,
    castOnError,
    Dict,
    equals,
    error,
    evaluate,
    evaluateObject,
    extractValues,
    isAny,
    List,
    Literalable,
    RegexLiteral,
    requiredKeyOf,
    stringKeyOf,
    tryCatch
} from "../../utils/generics.ts"
import { keysOf } from "../../utils/generics.ts"
import type { objectKindOf } from "../../utils/objectKinds.ts"
import type { Path, pathToString } from "../../utils/paths.ts"
import type { SizedData } from "../../utils/size.ts"
import type { Out, ParsedMorph } from "../tuple/morph.ts"
import type { StringLiteral } from "./shift/operand/enclosed.ts"
import type { Scanner } from "./shift/scanner.ts"

export type inferAst<ast, $> = ast extends List
    ? ast[1] extends "[]"
        ? inferAst<ast[0], $>[]
        : ast[1] extends "|"
        ? inferUnion<
              inferAst<ast[0], $>,
              inferAst<ast[2], $>
          > extends infer result
            ? castOnError<result, never>
            : never
        : ast[1] extends "&"
        ? inferIntersection<
              inferAst<ast[0], $>,
              inferAst<ast[2], $>
          > extends infer result
            ? castOnError<result, never>
            : never
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends number
            ? inferAst<ast[2], $>
            : inferAst<ast[0], $>
        : ast[1] extends "%"
        ? inferAst<ast[0], $>
        : never
    : inferTerminal<ast, $>

export type validateAstSemantics<ast, $> = ast extends string
    ? undefined
    : ast extends [infer child, unknown]
    ? validateAstSemantics<child, $>
    : ast extends [infer l, infer token, infer r]
    ? token extends "&"
        ? tryCatch<
              inferIntersection<inferAst<l, $>, inferAst<r, $>>,
              validateBinary<l, r, $>
          >
        : token extends "|"
        ? tryCatch<
              inferUnion<inferAst<l, $>, inferAst<r, $>>,
              validateBinary<l, r, $>
          >
        : token extends Scanner.Comparator
        ? l extends number
            ? validateAstSemantics<r, $>
            : isBoundable<inferAst<l, $>> extends true
            ? validateAstSemantics<l, $>
            : error<writeUnboundableMessage<astToString<ast[0]>>>
        : token extends "%"
        ? isDivisible<inferAst<l, $>> extends true
            ? validateAstSemantics<l, $>
            : error<writeIndivisibleMessage<astToString<ast[0]>>>
        : validateAstSemantics<l, $>
    : undefined

type validateBinary<l, r, $> = tryCatch<
    validateAstSemantics<l, $>,
    tryCatch<validateAstSemantics<r, $>, undefined>
>

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
        : (In: evaluate<lIn & r>) => Out<lOut>
    : r extends ParsedMorph<infer rIn, infer rOut>
    ? (In: evaluate<rIn & l>) => Out<rOut>
    : [l, r] extends [Dict, Dict]
    ? bubblePropErrors<
          evaluateObject<
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
          [...path, "${number}"]
      > extends infer result
        ? tryCatch<result, result[]>
        : never
    : l & r

type bubblePropErrors<o> = extractValues<o, error> extends never
    ? o
    : extractValues<o, error>

export type inferUnion<l, r> = isAny<l | r> extends true
    ? any
    : [l] extends [never]
    ? r
    : [r] extends [never]
    ? l
    : [asIn<l>, asIn<r>] extends [infer lIn, infer rIn]
    ? [equals<l, lIn>, equals<r, rIn>] extends [true, true]
        ? l | r
        : discriminatable<lIn, rIn> extends true
        ? l | r
        : error<undiscriminatableMorphUnionMessage>
    : never

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

export const compileDisjointReasonsMessage = (disjoints: DisjointsByPath) => {
    const paths = keysOf(disjoints)
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

export const writeUndiscriminatableMorphUnionMessage = <path extends string>(
    path: path
) =>
    `${
        path === "/" ? "A" : `At ${path}, a`
    } union including one or more morphs must be discriminatable`

type undiscriminatableMorphUnionMessage =
    `A union including one or more morphs must be discriminatable`

type isDivisible<data> = isAny<data> extends true
    ? false
    : [data] extends [number]
    ? true
    : false

type isBoundable<data> = isAny<data> extends true
    ? false
    : [data] extends [SizedData]
    ? true
    : false

export type inferTerminal<token, $> = token extends keyof $
    ? resolve<token, $>
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : never

export type astToString<ast> = `'${astToStringRecurse<ast, "">}'`

type astToStringRecurse<ast, result extends string> = ast extends [
    infer head,
    ...infer tail
]
    ? astToStringRecurse<tail, `${result}${astToStringRecurse<head, "">}`>
    : ast extends Literalable
    ? `${result}${ast extends bigint ? `${ast}n` : ast}`
    : "..."

export const writeIndivisibleMessage = <root extends string>(
    root: root
): writeIndivisibleMessage<root> =>
    `Divisibility operand ${root} must be a number`

type writeIndivisibleMessage<root extends string> =
    `Divisibility operand ${root} must be a number`

export const writeUnboundableMessage = <root extends string>(
    root: root
): writeUnboundableMessage<root> =>
    `Bounded expression ${root} must be a number, string or array`

type writeUnboundableMessage<root extends string> =
    `Bounded expression ${root} must be a number, string or array`
