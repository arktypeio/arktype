import type { Keyword, Keywords } from "../../nodes/keywords.ts"
import type { BootstrapScope } from "../../scope.ts"
import type {
    Dict,
    Downcastable,
    error,
    evaluate,
    isAny,
    List,
    RegexLiteral
} from "../../utils/generics.ts"
import type { inferDefinition } from "../definition.ts"
import type { Out, ParsedMorph } from "../tuple/morph.ts"
import type { StringLiteral } from "./shift/operand/enclosed.ts"
import type { Scanner } from "./shift/scanner.ts"

export type inferAst<ast, $> = ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], $>[]
        : ast[1] extends "|"
        ? inferUnion<
              inferAst<ast[0], $>,
              inferAst<ast[2], $>
          > extends infer result
            ? // TODO: more robust against top types
              result extends error
                ? never
                : result
            : never
        : ast[1] extends "&"
        ? inferIntersection<
              inferAst<ast[0], $>,
              inferAst<ast[2], $>
          > extends infer result
            ? result extends error
                ? never
                : result
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
        ? inferIntersection<inferAst<l, $>, inferAst<r, $>> extends error<
              infer message
          >
            ? error<message>
            : validateBinary<l, r, $>
        : token extends "|"
        ? inferUnion<inferAst<l, $>, inferAst<r, $>> extends error<
              infer message
          >
            ? error<message>
            : validateBinary<l, r, $>
        : token extends Scanner.Comparator
        ? l extends number
            ? validateAstSemantics<r, $>
            : isBoundable<inferAst<l, $>> extends true
            ? validateAstSemantics<l, $>
            : error<buildUnboundableMessage<astToString<ast[0]>>>
        : token extends "%"
        ? isDivisible<inferAst<l, $>> extends true
            ? validateAstSemantics<l, $>
            : error<buildIndivisibleMessage<astToString<ast[0]>>>
        : validateAstSemantics<l, $>
    : undefined

type validateBinary<l, r, $> = validateAstSemantics<l, $> extends error<
    infer leftMessage
>
    ? leftMessage
    : validateAstSemantics<r, $> extends error<infer rightMessage>
    ? rightMessage
    : undefined

export type inferIntersection<l, r> = inferIntersectionRecurse<l, r, never>

type inferIntersectionRecurse<l, r, seen> = [l] extends [seen]
    ? l & r
    : [l] extends [ParsedMorph<infer lIn, infer lOut>]
    ? r extends ParsedMorph
        ? error<doubleMorphIntersectionMessage>
        : (In: evaluate<lIn & r>) => Out<lOut>
    : [r] extends [ParsedMorph<infer rIn, infer rOut>]
    ? (In: evaluate<rIn & l>) => Out<rOut>
    : [l, r] extends [Dict, Dict]
    ? bubblePropErrors<
          evaluate<
              {
                  [k in keyof l]: k extends keyof r
                      ? inferIntersectionRecurse<l[k], r[k], seen | l>
                      : l[k]
              } & Omit<r, keyof l>
          >
      >
    : [l, r] extends [List<infer lItem>, List<infer rItem>]
    ? inferIntersectionRecurse<lItem, rItem, seen> extends infer result
        ? result extends error
            ? result
            : result[]
        : never
    : l & r

type bubblePropErrors<t> = errorKeyOf<t> extends never ? t : t[errorKeyOf<t>]

type errorKeyOf<t> = {
    [k in keyof t]: isAny<t[k]> extends true
        ? never
        : t[k] extends never
        ? never
        : t[k] extends error
        ? k
        : never
}[keyof t]

export type inferUnion<l, r> = [l] extends [ParsedMorph<infer lIn, infer lOut>]
    ? [r] extends [ParsedMorph<infer rIn, infer rOut>]
        ? lIn & rIn extends never
            ? (In: lIn | rIn) => Out<lOut | rOut>
            : undiscriminatableMorphUnionMessage
        : lIn & r extends never
        ? (In: lIn | r) => Out<lOut | r>
        : undiscriminatableMorphUnionMessage
    : [r] extends [ParsedMorph<infer rIn, infer rOut>]
    ? l & rIn extends never
        ? (In: l | rIn) => Out<l | rOut>
        : undiscriminatableMorphUnionMessage
    : l | r

export const doubleMorphIntersectionMessage = `An intersection must have at least one non-morph operand`

type doubleMorphIntersectionMessage = typeof doubleMorphIntersectionMessage

export const undiscriminatableMorphUnionMessage = `A union of one or more morphs must be discriminatable`

type undiscriminatableMorphUnionMessage =
    typeof undiscriminatableMorphUnionMessage

type isNonLiteralNumber<t> = t extends number
    ? number extends t
        ? true
        : false
    : false

type isNonLiteralString<t> = t extends string
    ? string extends t
        ? true
        : false
    : false

type isDivisible<data> = isAny<data> extends true
    ? true
    : isNonLiteralNumber<data>

type isBoundable<data> = isAny<data> extends true
    ? true
    : isNonLiteralNumber<data> extends true
    ? true
    : isNonLiteralString<data> extends true
    ? true
    : data extends List
    ? true
    : false

type inferTerminal<token, $> = token extends Keyword
    ? Keywords[token]
    : token extends keyof $
    ? $ extends BootstrapScope
        ? inferDefinition<$[token], $>
        : $[token]
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : never

export type astToString<ast, result extends string = ""> = ast extends [
    infer head,
    ...infer tail
]
    ? astToString<tail, `${result}${astToString<head>}`>
    : ast extends Downcastable
    ? `${result}${ast extends bigint ? `${ast}n` : ast}`
    : "..."

export const buildIndivisibleMessage = <root extends string>(
    root: root
): buildIndivisibleMessage<root> =>
    `Divisibility operand ${root} must be a non-literal number`

type buildIndivisibleMessage<root extends string> =
    `Divisibility operand ${root} must be a non-literal number`

export const buildUnboundableMessage = <root extends string>(
    root: root
): buildUnboundableMessage<root> =>
    `Bounded expression ${root} must be a non-literal number, string or array`

type buildUnboundableMessage<root extends string> =
    `Bounded expression ${root} must be a non-literal number, string or array`
