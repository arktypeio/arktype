import type { resolve } from "../../scopes/scope.js"
import type {
    castOnError,
    error,
    List,
    RegexLiteral,
    tryCatch
} from "../../utils/generics.js"
import type {
    BigintLiteral,
    NumberLiteral
} from "../../utils/numericLiterals.js"
import type { StringLiteral } from "../string/shift/operand/enclosed.js"
import type { Scanner } from "../string/shift/scanner.js"
import type { parseString } from "../string/string.js"
import type { validateBound } from "./bound.js"
import type { validateDivisor } from "./divisor.js"
import type { inferIntersection } from "./intersection.js"
import type { inferUnion } from "./union.js"

export type inferAst<ast, $> = ast extends List
    ? inferExpression<ast, $>
    : inferTerminal<ast, $>

export type inferExpression<ast extends List, $> = ast[1] extends "[]"
    ? inferAst<ast[0], $>[]
    : ast[1] extends "|"
    ? inferUnion<inferAst<ast[0], $>, inferAst<ast[2], $>> extends infer result
        ? castOnError<result, never>
        : never
    : ast[1] extends "&"
    ? inferIntersection<
          inferAst<ast[0], $>,
          inferAst<ast[2], $>
      > extends infer result
        ? castOnError<result, never>
        : never
    : ast[1] extends Scanner.Comparator
    ? ast[0] extends NumberLiteral
        ? inferAst<ast[2], $>
        : inferAst<ast[0], $>
    : ast[1] extends "%"
    ? inferAst<ast[0], $>
    : never

export type validateAst<ast, $> = ast extends List
    ? validateExpression<ast, $>
    : ast

export type validateExpression<
    ast extends List,
    $
> = ast extends PostfixExpression<infer operator, infer operand>
    ? operator extends "[]"
        ? validateAst<operand, $>
        : never
    : ast extends InfixExpression<infer operator, infer l, infer r>
    ? operator extends "&"
        ? tryCatch<
              inferIntersection<inferAst<l, $>, inferAst<r, $>>,
              validateInfix<ast, $>
          >
        : operator extends "|"
        ? tryCatch<
              inferUnion<inferAst<l, $>, inferAst<r, $>>,
              validateInfix<ast, $>
          >
        : operator extends Scanner.Comparator
        ? validateBound<l, r, $>
        : operator extends "%"
        ? validateDivisor<l, $>
        : never
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

export type InfixOperator =
    | "|"
    | "&"
    | Scanner.Comparator
    | "%"
    | ":"
    | "=>"
    | "|>"

export type InfixExpression<
    operator extends InfixOperator = InfixOperator,
    l = unknown,
    r = unknown
> = [l, operator, r]

type validateInfix<ast extends InfixExpression, $> = tryCatch<
    validateAst<ast[0], $>,
    tryCatch<validateAst<ast[2], $>, ast>
>

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
