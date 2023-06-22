import type { error, List } from "../../../dev/utils/main.js"
import type {
    BigintLiteral,
    NumberLiteral,
    writeMalformedNumericLiteralMessage
} from "../../../dev/utils/src/numericLiterals.js"
import type { Comparator } from "../../nodes/primitive/range.js"
import type { resolve, UnparsedScope } from "../../scope.js"
import type { GenericProps } from "../../type.js"
import type { CastTo, inferDefinition } from "../definition.js"
import type { writeInvalidGenericArgsMessage } from "../generic.js"
import type { DateLiteral } from "../string/shift/operand/date.js"
import type { StringLiteral } from "../string/shift/operand/enclosed.js"
import type { parseString } from "../string/string.js"
import type { validateBound } from "./bound.js"
import type { validateDivisor } from "./divisor.js"
import type { inferIntersection } from "./intersections.js"
import type { astToString } from "./utils.js"

export type inferAst<ast, $, args> = ast extends List
    ? inferExpression<ast, $, args>
    : inferTerminal<ast, $, args>

export type GenericInstantiationAst<
    g extends GenericProps = GenericProps,
    argAsts extends unknown[] = unknown[]
> = [g, "<>", argAsts]

export type inferExpression<
    ast extends List,
    $,
    args
> = ast extends GenericInstantiationAst
    ? inferDefinition<
          ast[0]["definition"],
          ast[0]["$"] extends UnparsedScope
              ? // If the generic was defined in the current scope, its definition can be
                // resolved using the same scope as that of the input args.
                $
              : // Otherwise, use the scope that was explicitly associated with it.
                ast[0]["$"],
          {
              // Using keyof g["parameters"] & number here results in the element types
              // being mixed- another reason TS should not have separate `${number}` and number keys!
              [i in keyof ast[0]["parameters"] &
                  `${number}` as ast[0]["parameters"][i]]: inferAst<
                  ast[2][i & keyof ast[2]],
                  $,
                  args
              >
          }
      >
    : ast[1] extends "[]"
    ? inferAst<ast[0], $, args>[]
    : ast[1] extends "|"
    ? inferAst<ast[0], $, args> | inferAst<ast[2], $, args>
    : ast[1] extends "&"
    ? inferIntersection<inferAst<ast[0], $, args>, inferAst<ast[2], $, args>>
    : ast[1] extends Comparator
    ? ast[0] extends NumberLiteral
        ? inferAst<ast[2], $, args>
        : inferAst<ast[0], $, args>
    : ast[1] extends "%"
    ? inferAst<ast[0], $, args>
    : ast[0] extends "keyof"
    ? keyof inferAst<ast[1], $, args>
    : never

export type validateAst<ast, $, args> = ast extends string
    ? validateStringAst<ast, $>
    : ast extends PostfixExpression<infer operator, infer operand>
    ? operator extends "[]"
        ? validateAst<operand, $, args>
        : never
    : ast extends InfixExpression<infer operator, infer l, infer r>
    ? operator extends "&" | "|"
        ? validateInfix<ast, $, args>
        : operator extends Comparator
        ? validateBound<l, r, $, args>
        : operator extends "%"
        ? validateDivisor<l, $, args>
        : undefined
    : ast extends readonly ["keyof", infer operand]
    ? [keyof inferAst<operand, $, args>] extends [never]
        ? error<writeUnsatisfiableExpressionError<astToString<ast>>>
        : validateAst<operand, $, args>
    : ast extends GenericInstantiationAst
    ? validateGenericArgs<ast["2"], $, args>
    : never

type validateGenericArgs<argAsts extends unknown[], $, args> = argAsts extends [
    infer head,
    ...infer tail
]
    ? validateAst<head, $, args> extends error<infer message>
        ? error<message>
        : validateGenericArgs<tail, $, args>
    : undefined

export const writeUnsatisfiableExpressionError = <expression extends string>(
    expression: expression
): writeUnsatisfiableExpressionError<expression> =>
    `${expression} results in an unsatisfiable type`

export type writeUnsatisfiableExpressionError<expression extends string> =
    `${expression} results in an unsatisfiable type`

type validateStringAst<def extends string, $> = def extends NumberLiteral<
    infer value
>
    ? number extends value
        ? error<writeMalformedNumericLiteralMessage<def, "number">>
        : undefined
    : def extends BigintLiteral<infer value>
    ? bigint extends value
        ? error<writeMalformedNumericLiteralMessage<def, "bigint">>
        : undefined
    : def extends keyof $
    ? // these problems would've been caught during a fullStringParse, but it's most
      // efficient to check for them here in case the string was naively parsed
      $[def] extends GenericProps
        ? error<writeInvalidGenericArgsMessage<def, $[def]["parameters"], []>>
        : undefined
    : undefined

export type validateString<def extends string, $, args> = parseString<
    def,
    $,
    args
> extends infer ast
    ? ast extends error<infer message>
        ? error<message>
        : validateAst<ast, $, args> extends error<infer message>
        ? error<message>
        : def
    : never

export type PrefixOperator = "keyof" | "instanceof" | "===" | "node"

export type PrefixExpression<
    operator extends PrefixOperator = PrefixOperator,
    operand = unknown
> = [operator, operand]

export type PostfixOperator = "[]"

export type PostfixExpression<
    operator extends PostfixOperator = PostfixOperator,
    operand = unknown
> = [operand, operator]

export type InfixOperator = "|" | "&" | Comparator | "%" | ":" | "=>"

export type InfixExpression<
    operator extends InfixOperator = InfixOperator,
    l = unknown,
    r = unknown
> = [l, operator, r]

type validateInfix<ast extends InfixExpression, $, args> = validateAst<
    ast[0],
    $,
    args
> extends error<infer message>
    ? error<message>
    : validateAst<ast[2], $, args> extends error<infer message>
    ? error<message>
    : undefined

export type RegexLiteral<expression extends string = string> = `/${expression}/`

export type inferTerminal<token, $, args> = token extends keyof args | keyof $
    ? resolve<token, $, args>
    : token extends CastTo<infer t>
    ? t
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends DateLiteral
    ? Date
    : token extends NumberLiteral<infer value>
    ? value
    : token extends BigintLiteral<infer value>
    ? value
    : never
