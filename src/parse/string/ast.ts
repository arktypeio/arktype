import type { Keyword, Keywords } from "../../nodes/keywords.ts"
import type { Scope } from "../../scope.ts"
import type {
    Downcastable,
    error,
    evaluate,
    isAny,
    List,
    RegexLiteral
} from "../../utils/generics.ts"
import type { inferDefinition } from "../definition.ts"
import type { StringLiteral } from "./shift/operand/enclosed.ts"
import type { Scanner } from "./shift/scanner.ts"

export type inferAst<ast, scope extends Scope> = ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], scope>[]
        : ast[1] extends "|"
        ? inferAst<ast[0], scope> | inferAst<ast[2], scope>
        : ast[1] extends "&"
        ? evaluate<inferAst<ast[0], scope> & inferAst<ast[2], scope>>
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends number
            ? inferAst<ast[2], scope>
            : inferAst<ast[0], scope>
        : ast[1] extends "%"
        ? inferAst<ast[0], scope>
        : never
    : inferTerminal<ast, scope>

export type validateAstSemantics<ast, scope extends Scope> = ast extends string
    ? undefined
    : ast extends [infer child, unknown]
    ? validateAstSemantics<child, scope>
    : ast extends [infer left, infer token, infer right]
    ? token extends Scanner.BranchToken
        ? validateAstSemantics<left, scope> extends error<infer leftMessage>
            ? leftMessage
            : validateAstSemantics<right, scope> extends error<
                  infer rightMessage
              >
            ? rightMessage
            : undefined
        : token extends Scanner.Comparator
        ? left extends number
            ? validateAstSemantics<right, scope>
            : isBoundable<inferAst<left, scope>> extends true
            ? validateAstSemantics<left, scope>
            : error<buildUnboundableMessage<astToString<ast[0]>>>
        : token extends "%"
        ? isDivisible<inferAst<left, scope>> extends true
            ? validateAstSemantics<left, scope>
            : error<buildIndivisibleMessage<astToString<ast[0]>>>
        : validateAstSemantics<left, scope>
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
    : inferred extends List
    ? true
    : false

type inferTerminal<token, scope extends Scope> = token extends Keyword
    ? Keywords[token]
    : token extends keyof scope["infer"]
    ? scope["infer"][token]
    : token extends keyof scope["def"]
    ? inferDefinition<scope["def"][token], scope>
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
