import type { Keyword, Keywords } from "../../nodes/keywords.js"
import type {
    Downcastable,
    error,
    evaluate,
    isAny,
    RegexLiteral
} from "../../utils/generics.js"
import type { inferDefinition, InferenceContext } from "../definition.js"
import type { StringLiteral } from "./shift/operand/enclosed.js"
import type { Scanner } from "./shift/scanner.js"

export type inferAst<
    ast,
    c extends InferenceContext
> = ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], c>[]
        : ast[1] extends "|"
        ? inferAst<ast[0], c> | inferAst<ast[2], c>
        : ast[1] extends "&"
        ? evaluate<inferAst<ast[0], c> & inferAst<ast[2], c>>
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends number
            ? inferAst<ast[2], c>
            : inferAst<ast[0], c>
        : ast[1] extends "%"
        ? inferAst<ast[0], c>
        : never
    : inferTerminal<ast, c>

export type validateAstSemantics<
    ast,
    c extends InferenceContext
> = ast extends string
    ? undefined
    : ast extends [infer child, unknown]
    ? validateAstSemantics<child, c>
    : ast extends [infer left, infer token, infer right]
    ? token extends Scanner.BranchToken
        ? validateAstSemantics<left, c> extends error<infer leftMessage>
            ? leftMessage
            : validateAstSemantics<right, c> extends error<infer rightMessage>
            ? rightMessage
            : undefined
        : token extends Scanner.Comparator
        ? left extends number
            ? validateAstSemantics<right, c>
            : isBoundable<inferAst<left, c>> extends true
            ? validateAstSemantics<left, c>
            : error<buildUnboundableMessage<astToString<ast[0]>>>
        : token extends "%"
        ? isDivisible<inferAst<left, c>> extends true
            ? validateAstSemantics<left, c>
            : error<buildIndivisibleMessage<astToString<ast[0]>>>
        : validateAstSemantics<left, c>
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

type isDivisible<inferred> = isAny<inferred> extends true
    ? true
    : isNonLiteralNumber<inferred>

type isBoundable<inferred> = isAny<inferred> extends true
    ? true
    : isNonLiteralNumber<inferred> extends true
    ? true
    : isNonLiteralString<inferred> extends true
    ? true
    : inferred extends readonly unknown[]
    ? true
    : false

type inferTerminal<token, c extends InferenceContext> = token extends Keyword
    ? Keywords[token]
    : token extends keyof c["scope"]
    ? c["scope"][token]
    : token extends keyof c["aliases"]
    ? inferDefinition<c["aliases"][token], c>
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
