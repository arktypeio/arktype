import type { Keyword, Keywords } from "../../nodes/keywords.ts"
import type { Primitive } from "../../utils/domains.ts"
import type {
    Downcastable,
    error,
    evaluate,
    isAny,
    List,
    RegexLiteral
} from "../../utils/generics.ts"
import type { inferDefinition } from "../definition.ts"
import type { Morph, out } from "../tuple/morph.ts"
import type { StringLiteral } from "./shift/operand/enclosed.ts"
import type { Scanner } from "./shift/scanner.ts"

export type inferAst<ast, $> = ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], $>[]
        : ast[1] extends "|"
        ? inferAst<ast[0], $> | inferAst<ast[2], $>
        : ast[1] extends "&"
        ? intersectTypes<
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

export type intersectTypes<l, r> = l extends Morph<infer In, infer Out>
    ? r extends Morph
        ? error<doubleMorphIntersectionMessage>
        : (In: evaluate<In & r>) => out<Out>
    : r extends Morph<infer In, infer Out>
    ? (In: evaluate<In & l>) => out<Out>
    : l extends object
    ? r extends object
        ? evaluate<{
              [k in keyof l | keyof r]: k extends keyof l
                  ? k extends keyof r
                      ? intersectTypes<l[k], r[k]>
                      : l[k]
                  : k extends keyof r
                  ? r[k]
                  : never
          }> extends infer nextResult
            ? error<doubleMorphIntersectionMessage> extends nextResult[keyof nextResult]
                ? error<doubleMorphIntersectionMessage>
                : nextResult
            : never
        : l & r
    : l & r

export const doubleMorphIntersectionMessage = `An intersection must have at least one non-morph operand.`

type doubleMorphIntersectionMessage = typeof doubleMorphIntersectionMessage

type validateBinary<l, r, $> = validateAstSemantics<l, $> extends error<
    infer leftMessage
>
    ? leftMessage
    : validateAstSemantics<r, $> extends error<infer rightMessage>
    ? rightMessage
    : undefined

export type validateAstSemantics<ast, $> = ast extends string
    ? undefined
    : ast extends [infer child, unknown]
    ? validateAstSemantics<child, $>
    : ast extends [infer l, infer token, infer r]
    ? token extends "&"
        ? intersectTypes<inferAst<l, $>, inferAst<r, $>> extends error<
              infer message
          >
            ? error<message>
            : validateBinary<l, r, $>
        : token extends "|"
        ? validateBinary<l, r, $>
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
    ? inferDefinition<$[token], $>
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
