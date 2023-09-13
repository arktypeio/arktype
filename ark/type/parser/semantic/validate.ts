import type {
	BigintLiteral,
	error,
	NumberLiteral,
	writeMalformedNumericLiteralMessage
} from "@arktype/util"
import type { Module } from "../../scope.js"
import type { GenericProps } from "../../type.js"
import type { writeInvalidGenericArgsMessage } from "../generic.js"
import type { writeMissingSubmoduleAccessMessage } from "../string/shift/operand/unenclosed.js"
import type { Comparator } from "../string/shift/operator/bounds.js"
import type { parseString } from "../string/string.js"
import type { validateRange } from "./bounds.js"
import type { validateDivisor } from "./divisor.js"
import type {
	GenericInstantiationAst,
	InfixExpression,
	PostfixExpression
} from "./semantic.js"
import type { astToString } from "./utils.js"

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
		? validateRange<l, operator, r, $, args>
		: operator extends "%"
		? validateDivisor<l, $, args>
		: undefined
	: ast extends readonly ["keyof", infer operand]
	? validateAst<operand, $, args>
	: ast extends GenericInstantiationAst
	? validateGenericArgs<ast["2"], $, args>
	: error<writeUnexpectedExpressionMessage<astToString<ast>>>

type writeUnexpectedExpressionMessage<expression extends string> =
	`Unexpectedly failed to parse the expression resulting from ${expression}`

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
		: $[def] extends Module
		? error<writeMissingSubmoduleAccessMessage<def>>
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

type validateInfix<ast extends InfixExpression, $, args> = validateAst<
	ast[0],
	$,
	args
> extends error<infer message>
	? error<message>
	: validateAst<ast[2], $, args> extends error<infer message>
	? error<message>
	: undefined
