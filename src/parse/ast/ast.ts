import type { resolve } from "../../scopes/scope.ts"
import type {
    castOnError,
    error,
    List,
    RegexLiteral,
    tryCatch
} from "../../utils/generics.ts"
import type { StringLiteral } from "../string/shift/operand/enclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { parseString } from "../string/string.ts"
import type { validateBound } from "./bound.ts"
import type { validateDivisor } from "./divisor.ts"
import type { inferIntersection } from "./intersection.ts"
import type { inferUnion } from "./union.ts"

export type inferAst<ast, $> = ast extends List
    ? ast[1] extends "[]"
        ? inferAst<ast[0], $>[]
        : ast[1] extends "|"
        ? inferUnion<
              inferAst<ast[0], $>,
              inferAst<ast[2], $>
          > extends infer result
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
        ? ast[0] extends number
            ? inferAst<ast[2], $>
            : inferAst<ast[0], $>
        : ast[1] extends "%"
        ? inferAst<ast[0], $>
        : never
    : inferTerminal<ast, $>

export type validateSemantics<def, $> = def extends string
    ? validateString<def, $>
    : def extends [infer child, unknown]
    ? validateSemantics<child, $>
    : def extends [infer l, infer token, infer r]
    ? token extends "&"
        ? tryCatch<
              inferIntersection<inferAst<l, $>, inferAst<r, $>>,
              validateBinary<l, r, $>
          >
        : token extends "|"
        ? tryCatch<
              inferUnion<inferAst<l, $>, inferAst<r, $>>,
              validateBinary<l, r, $>
          >
        : token extends Scanner.Comparator
        ? validateBound<l, r, $>
        : token extends "%"
        ? validateDivisor<l, $>
        : validateSemantics<l, $>
    : undefined

export type validateString<def extends string, $> = parseString<
    def,
    $
> extends infer ast
    ? ast extends error<infer message>
        ? message
        : ast extends List
        ? validateSemantics<ast, $> extends error<infer message>
            ? message
            : def
        : def
    : never

type validateBinary<l, r, $> = tryCatch<
    validateSemantics<l, $>,
    tryCatch<validateSemantics<r, $>, undefined>
>

export type inferTerminal<token, $> = token extends keyof $
    ? resolve<token, $>
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : never
