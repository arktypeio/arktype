import type {
	GenericProps,
	writeMissingSubmoduleAccessMessage
} from "@arktype/schema"
import type {
	BigintLiteral,
	Completion,
	ErrorMessage,
	NumberLiteral,
	writeMalformedNumericLiteralMessage
} from "@arktype/util"
import type { Module } from "../../scope.js"
import type { Comparator } from "../string/reduce/shared.js"
import type { writeInvalidGenericArgsMessage } from "../string/shift/operand/genericArgs.js"
import type { parseString } from "../string/string.js"
import type { validateRange } from "./bounds.js"
import type { validateDivisor } from "./divisor.js"
import type {
	GenericInstantiationAst,
	InfixExpression,
	PostfixExpression
} from "./infer.js"
import type { astToString } from "./utils.js"

export type validateAst<ast, $> = ast extends string
	? validateStringAst<ast, $>
	: ast extends PostfixExpression<infer operator, infer operand>
		? operator extends "[]"
			? validateAst<operand, $>
			: never
		: ast extends InfixExpression<infer operator, infer l, infer r>
			? operator extends "&" | "|"
				? validateInfix<ast, $>
				: operator extends Comparator
					? validateRange<l, operator, r, $>
					: operator extends "%"
						? validateDivisor<l, $>
						: undefined
			: ast extends readonly ["keyof", infer operand]
				? validateAst<operand, $>
				: ast extends GenericInstantiationAst
					? validateGenericArgs<ast["2"], $>
					: ErrorMessage<
							writeUnexpectedExpressionMessage<astToString<ast>>
						> & { ast: ast }

type writeUnexpectedExpressionMessage<expression extends string> =
	`Unexpectedly failed to parse the expression resulting from ${expression}`

type validateGenericArgs<argAsts extends unknown[], $> = argAsts extends [
	infer head,
	...infer tail
]
	? validateAst<head, $> extends ErrorMessage<infer message>
		? ErrorMessage<message>
		: validateGenericArgs<tail, $>
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
		? ErrorMessage<writeMalformedNumericLiteralMessage<def, "number">>
		: undefined
	: def extends BigintLiteral<infer value>
		? bigint extends value
			? ErrorMessage<writeMalformedNumericLiteralMessage<def, "bigint">>
			: undefined
		: def extends keyof $
			? $[def] extends null
				? // handle any/never
					def
				: // these problems would've been caught during a fullStringParse, but it's most
					// efficient to check for them here in case the string was naively parsed
					$[def] extends GenericProps
					? ErrorMessage<
							writeInvalidGenericArgsMessage<
								def,
								$[def]["params"],
								[]
							>
						>
					: $[def] extends Module
						? ErrorMessage<writeMissingSubmoduleAccessMessage<def>>
						: undefined
			: def extends ErrorMessage
				? def
				: undefined

export type validateString<def extends string, $> = validateAst<
	parseString<def, $>,
	$
> extends infer result extends ErrorMessage
	? result extends Completion<infer text>
		? text
		: result
	: def

type validateInfix<ast extends InfixExpression, $> = validateAst<
	ast[0],
	$
> extends ErrorMessage<infer message>
	? ErrorMessage<message>
	: validateAst<ast[2], $> extends ErrorMessage<infer message>
		? ErrorMessage<message>
		: undefined
