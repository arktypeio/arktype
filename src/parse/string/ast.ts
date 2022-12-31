import type { Keyword, Keywords } from "../../nodes/keywords.ts"
import type { inferResolution } from "../../scope.ts"
import type {
    Downcastable,
    error,
    evaluate,
    isAny,
    List,
    RegexLiteral
} from "../../utils/generics.ts"
import type { StringLiteral } from "./shift/operand/enclosed.ts"
import type { Scanner } from "./shift/scanner.ts"

export type inferAst<ast, $> = ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], $>[]
        : ast[1] extends "|"
        ? inferAst<ast[0], $> | inferAst<ast[2], $>
        : ast[1] extends "&"
        ? evaluate<inferAst<ast[0], $> & inferAst<ast[2], $>>
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
    : ast extends [infer left, infer token, infer right]
    ? token extends Scanner.BranchToken
        ? validateAstSemantics<left, $> extends error<infer leftMessage>
            ? leftMessage
            : validateAstSemantics<right, $> extends error<infer rightMessage>
            ? rightMessage
            : undefined
        : token extends Scanner.Comparator
        ? left extends number
            ? validateAstSemantics<right, $>
            : isBoundable<inferAst<left, $>> extends true
            ? validateAstSemantics<left, $>
            : error<buildUnboundableMessage<astToString<ast[0]>>>
        : token extends "%"
        ? isDivisible<inferAst<left, $>> extends true
            ? validateAstSemantics<left, $>
            : error<buildIndivisibleMessage<astToString<ast[0]>>>
        : validateAstSemantics<left, $>
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
    ? inferResolution<$[token], $>
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
