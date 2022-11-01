import type { IsAny } from "../internal.js"
import type { ParseError } from "../parser/common.js"
import type { Scanner } from "../parser/string/state/scanner.js"
import type { InferAst } from "./infer.js"
import type { ToString } from "./toString.js"

export type Validate<def, ast, resolutions> = def extends []
    ? def
    : ast extends ParseError<infer message>
    ? message
    : def extends string
    ? CatchErrorOrFallback<CheckAst<ast, resolutions>, def>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: Validate<def[K], ast[K], resolutions> }

type CatchErrorOrFallback<errors extends string[], def> = [] extends errors
    ? def
    : errors[0]

type CheckAst<ast, resolutions> = ast extends string
    ? []
    : ast extends [infer child, unknown]
    ? CheckAst<child, resolutions>
    : ast extends [infer left, infer token, infer right]
    ? token extends Scanner.NaryToken
        ? [...CheckAst<left, resolutions>, ...CheckAst<right, resolutions>]
        : token extends Scanner.Comparator
        ? left extends number
            ? CheckAst<right, resolutions>
            : IsBoundable<InferAst<left, resolutions>> extends true
            ? CheckAst<left, resolutions>
            : [buildUnboundableMessage<ToString<ast[0]>>]
        : token extends "%"
        ? IsDivisible<InferAst<left, resolutions>> extends true
            ? CheckAst<left, resolutions>
            : [buildIndivisibleMessage<ToString<ast[0]>>]
        : CheckAst<left, resolutions>
    : []

type IsNonLiteralNumber<t> = t extends number
    ? number extends t
        ? true
        : false
    : false

type IsNonLiteralString<t> = t extends string
    ? string extends t
        ? true
        : false
    : false

type IsDivisible<inferred> = IsAny<inferred> extends true
    ? true
    : IsNonLiteralNumber<inferred>

type IsBoundable<inferred> = IsAny<inferred> extends true
    ? true
    : IsNonLiteralNumber<inferred> extends true
    ? true
    : IsNonLiteralString<inferred> extends true
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
