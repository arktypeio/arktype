import type { Comparator } from "../../nodes/constraints/range.js"
import type { resolve } from "../../scope.js"
import type { error } from "../../utils/errors.js"
import type { evaluate } from "../../utils/generics.js"
import type { List } from "../../utils/lists.js"
import type {
    BigintLiteral,
    NumberLiteral,
    writeMalformedNumericLiteralMessage
} from "../../utils/numericLiterals.js"
import type { StringLiteral } from "../string/shift/operand/enclosed.js"
import type { parseString } from "../string/string.js"
import type { validateBound } from "./bound.js"
import type { validateDivisor } from "./divisor.js"

export type inferAst<ast, $> = ast extends List
    ? inferExpression<ast, $>
    : inferTerminal<ast, $>

export type inferExpression<ast extends List, $> = ast[1] extends "[]"
    ? inferAst<ast[0], $>[]
    : ast[1] extends "|"
    ? inferAst<ast[0], $> | inferAst<ast[2], $>
    : ast[1] extends "&"
    ? evaluate<inferAst<ast[0], $> & inferAst<ast[2], $>>
    : ast[1] extends Comparator
    ? ast[0] extends NumberLiteral
        ? inferAst<ast[2], $>
        : inferAst<ast[0], $>
    : ast[1] extends "%"
    ? inferAst<ast[0], $>
    : never

export type validateAst<ast, $> = ast extends string
    ? validateStringAst<ast>
    : ast extends PostfixExpression<infer operator, infer operand>
    ? operator extends "[]"
        ? validateAst<operand, $>
        : never
    : ast extends InfixExpression<infer operator, infer l, infer r>
    ? operator extends "&"
        ? validateInfix<ast, $>
        : operator extends "|"
        ? validateInfix<ast, $>
        : operator extends Comparator
        ? validateBound<l, r, $>
        : operator extends "%"
        ? validateDivisor<l, $>
        : undefined
    : never

type validateStringAst<def extends string> = def extends NumberLiteral<
    infer value
>
    ? number extends value
        ? error<writeMalformedNumericLiteralMessage<def, "number">>
        : undefined
    : def extends BigintLiteral<infer value>
    ? bigint extends value
        ? error<writeMalformedNumericLiteralMessage<def, "bigint">>
        : undefined
    : undefined

export type validateString<def extends string, $> = parseString<
    def,
    $
> extends infer ast
    ? ast extends error<infer message>
        ? message
        : validateAst<ast, $> extends error<infer message>
        ? message
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

export type InfixOperator = "|" | "&" | Comparator | "%" | ":" | "=>" | "|>"

export type InfixExpression<
    operator extends InfixOperator = InfixOperator,
    l = unknown,
    r = unknown
> = [l, operator, r]

type validateInfix<ast extends InfixExpression, $> = validateAst<
    ast[0],
    $
> extends error<infer message>
    ? message
    : validateAst<ast[2], $> extends error<infer message>
    ? message
    : ast

export type RegexLiteral<expression extends string = string> = `/${expression}/`

export type inferTerminal<token, $> = token extends keyof $
    ? resolve<token, $>
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends NumberLiteral<infer value>
    ? value
    : token extends BigintLiteral<infer value>
    ? value
    : never
