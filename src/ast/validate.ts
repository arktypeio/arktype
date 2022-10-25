import type { ParseError } from "../../parser/common.js"
import type { IsAny } from "../../utils/generics.js"
import type { Branching } from "../expression/branching/branching.js"
import type { Bound } from "../expression/infix/bound.js"
import type { NumberLiteral } from "../terminal/literal/number.js"
import type { inferAst } from "./infer.js"
import type { toString } from "./toString.js"

export type validate<def, ast, resolutions> = def extends []
    ? def
    : ast extends ParseError<infer message>
    ? message
    : def extends string
    ? catchErrorOrFallback<checkAst<ast, resolutions>, def>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: validate<def[K], ast[K], resolutions> }

type catchErrorOrFallback<errors extends string[], def> = [] extends errors
    ? def
    : errors[0]

type checkAst<ast, resolutions> = ast extends string
    ? []
    : ast extends [infer child, unknown]
    ? checkAst<child, resolutions>
    : ast extends [infer left, infer token, infer right]
    ? token extends Branching.Token
        ? [...checkAst<left, resolutions>, ...checkAst<right, resolutions>]
        : token extends Comparator.Token
        ? left extends NumberLiteral.Definition
            ? checkAst<right, resolutions>
            : isBoundable<inferAst<left, resolutions>> extends true
            ? checkAst<left, resolutions>
            : [buildUnboundableMessage<toString<ast[0]>>]
        : token extends "%"
        ? isDivisible<inferAst<left, resolutions>> extends true
            ? checkAst<left, resolutions>
            : [buildIndivisibleMessage<toString<ast[0]>>]
        : checkAst<left, resolutions>
    : []

type isNonLiteralNumber<T> = T extends number
    ? number extends T
        ? true
        : false
    : false

type isNonLiteralString<T> = T extends string
    ? string extends T
        ? true
        : false
    : false

type isDivisible<inferred> = IsAny<inferred> extends true
    ? true
    : isNonLiteralNumber<inferred>

type isBoundable<inferred> = IsAny<inferred> extends true
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
