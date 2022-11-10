import type { ParseError } from "../parse/common.js"
import type { Scanner } from "../parse/state/scanner.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { isAny } from "../utils/generics.js"
import type { inferAst } from "./infer.js"
import type { astToString } from "./toString.js"

export type validate<
    def,
    ast,
    scope extends dictionary,
    scopeAst extends dictionary = {}
> = def extends []
    ? def
    : ast extends ParseError<infer message>
    ? message
    : def extends string
    ? catchErrorOrFallback<checkAst<ast, scope, scopeAst>, def>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [k in keyof def]: validate<def[k], ast[k], scope> }

type catchErrorOrFallback<errors extends string[], def> = [] extends errors
    ? def
    : errors[0]

type checkAst<
    node,
    scope extends dictionary,
    scopeAst extends dictionary
> = node extends string
    ? []
    : node extends [infer child, unknown]
    ? checkAst<child, scope, scopeAst>
    : node extends [infer left, infer token, infer right]
    ? token extends Scanner.BranchToken
        ? [
              ...checkAst<left, scope, scopeAst>,
              ...checkAst<right, scope, scopeAst>
          ]
        : token extends Scanner.Comparator
        ? left extends number
            ? checkAst<right, scope, scopeAst>
            : isBoundable<inferAst<left, scope, scopeAst>> extends true
            ? checkAst<left, scope, scopeAst>
            : [buildUnboundableMessage<astToString<node[0]>>]
        : token extends "%"
        ? isDivisible<inferAst<left, scope, scopeAst>> extends true
            ? checkAst<left, scope, scopeAst>
            : [buildIndivisibleMessage<astToString<node[0]>>]
        : checkAst<left, scope, scopeAst>
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
