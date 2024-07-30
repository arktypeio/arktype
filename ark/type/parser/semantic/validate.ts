import type {
	arkKind,
	GenericParamAst,
	PrivateDeclaration,
	writeMissingSubmoduleAccessMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import type {
	anyOrNever,
	array,
	BigintLiteral,
	charsAfterFirst,
	Completion,
	ErrorMessage,
	typeToString,
	writeMalformedNumericLiteralMessage
} from "@ark/util"
import type { Generic } from "../../generic.js"
import type { Comparator } from "../string/reduce/shared.js"
import type { writeInvalidGenericArgCountMessage } from "../string/shift/operand/genericArgs.js"
import type { UnitLiteral } from "../string/shift/operator/default.js"
import type { parseString } from "../string/string.js"
import type { validateRange } from "./bounds.js"
import type { validateDefault } from "./default.js"
import type { validateDivisor } from "./divisor.js"
import type {
	GenericInstantiationAst,
	inferAstRoot,
	InfixExpression,
	PostfixExpression
} from "./infer.js"
import type { astToString } from "./utils.js"

export type validateAst<ast, $, args> =
	ast extends string ? validateStringAst<ast, $>
	: ast extends PostfixExpression<infer operator, infer operand> ?
		operator extends "[]" ?
			validateAst<operand, $, args>
		:	never
	: ast extends InfixExpression<infer operator, infer l, infer r> ?
		operator extends "&" | "|" ? validateInfix<ast, $, args>
		: operator extends Comparator ? validateRange<l, operator, r, $, args>
		: operator extends "%" ? validateDivisor<l, $, args>
		: undefined
	: ast extends (
		readonly [infer baseAst, "=", infer unitLiteral extends UnitLiteral]
	) ?
		validateDefault<baseAst, unitLiteral, $, args>
	: ast extends readonly ["keyof", infer operand] ?
		validateAst<operand, $, args>
	: ast extends GenericInstantiationAst<Generic<infer params>, infer argAsts> ?
		validateGenericArgs<params, argAsts, $, args, []>
	:	ErrorMessage<writeUnexpectedExpressionMessage<astToString<ast>>> & {
			ast: ast
		}

type writeUnexpectedExpressionMessage<expression extends string> =
	`Unexpectedly failed to parse the expression resulting from ${expression}`

type validateGenericArgs<
	params extends array<GenericParamAst>,
	argAsts extends array,
	$,
	args,
	indices extends 1[]
> =
	argAsts extends readonly [infer arg, ...infer argsTail] ?
		validateAst<arg, $, args> extends infer e extends ErrorMessage ? e
		: inferAstRoot<arg, $, args> extends params[indices["length"]][1] ?
			validateGenericArgs<params, argsTail, $, args, [...indices, 1]>
		:	ErrorMessage<
				writeUnsatisfiedParameterConstraintMessage<
					params[indices["length"]][0],
					typeToString<params[indices["length"]][1]>,
					astToString<arg>
				>
			>
	:	undefined

export const writeUnsatisfiableExpressionError = <expression extends string>(
	expression: expression
): writeUnsatisfiableExpressionError<expression> =>
	`${expression} results in an unsatisfiable type`

export type writeUnsatisfiableExpressionError<expression extends string> =
	`${expression} results in an unsatisfiable type`

export const writePrefixedPrivateReferenceMessage = <
	def extends PrivateDeclaration
>(
	def: def
): writePrefixedPrivateReferenceMessage<def> =>
	`Private type references should not include '#'. Use '${def.slice(1) as charsAfterFirst<def>}' instead.`

export type writePrefixedPrivateReferenceMessage<
	def extends PrivateDeclaration
> =
	`Private type references should not include '#'. Use '${charsAfterFirst<def>}' instead.`

type validateStringAst<def extends string, $> =
	def extends `${infer n extends number}` ?
		number extends n ?
			ErrorMessage<writeMalformedNumericLiteralMessage<def, "number">>
		:	undefined
	: def extends BigintLiteral<infer b> ?
		bigint extends b ?
			ErrorMessage<writeMalformedNumericLiteralMessage<def, "bigint">>
		:	undefined
	: maybeExtractAlias<def, $> extends infer alias extends keyof $ ?
		[$[alias]] extends [anyOrNever] ? def
		: def extends PrivateDeclaration ?
			ErrorMessage<writePrefixedPrivateReferenceMessage<def>>
		: // these problems would've been caught during a fullStringParse, but it's most
		// efficient to check for them here in case the string was naively parsed
		$[alias] extends Generic ?
			ErrorMessage<
				writeInvalidGenericArgCountMessage<def, $[alias]["names"], []>
			>
		: $[alias] extends { [arkKind]: "module" } ?
			ErrorMessage<writeMissingSubmoduleAccessMessage<def>>
		:	undefined
	: def extends ErrorMessage ? def
	: undefined

export type maybeExtractAlias<def extends string, $> =
	def extends keyof $ ? def
	: `#${def}` extends keyof $ ? `#${def}`
	: null

export type validateString<def extends string, $, args> =
	validateAst<parseString<def, $, args>, $, args> extends (
		infer result extends ErrorMessage
	) ?
		result extends Completion<infer text> ?
			text
		:	result
	:	def

type validateInfix<ast extends InfixExpression, $, args> =
	validateAst<ast[0], $, args> extends infer e extends ErrorMessage ? e
	: validateAst<ast[2], $, args> extends infer e extends ErrorMessage ? e
	: undefined
