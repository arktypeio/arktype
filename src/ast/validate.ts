import type { isAny } from "../internal.js"
import type { ParseError } from "../parser/common.js"
import type { Scanner } from "../parser/string/state/scanner.js"
import type { inferAst } from "./infer.js"
import type { astToString } from "./toString.js"

export type validate<def, ast, spaceAst> = def extends []
    ? def
    : ast extends ParseError<infer message>
    ? message
    : def extends string
    ? catchErrorOrFallback<checkAst<ast, spaceAst>, def>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: validate<def[K], ast[K], spaceAst> }

type catchErrorOrFallback<errors extends string[], def> = [] extends errors
    ? def
    : errors[0]

type checkAst<node, spaceAst> = node extends string
    ? []
    : node extends [infer child, unknown]
    ? checkAst<child, spaceAst>
    : node extends [infer left, infer token, infer right]
    ? token extends Scanner.NaryToken
        ? [...checkAst<left, spaceAst>, ...checkAst<right, spaceAst>]
        : token extends Scanner.Comparator
        ? left extends number
            ? checkAst<right, spaceAst>
            : isBoundable<inferAst<left, spaceAst>> extends true
            ? checkAst<left, spaceAst>
            : [buildUnboundableMessage<astToString<node[0]>>]
        : token extends "%"
        ? isDivisible<inferAst<left, spaceAst>> extends true
            ? checkAst<left, spaceAst>
            : [buildIndivisibleMessage<astToString<node[0]>>]
        : checkAst<left, spaceAst>
    : []

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
