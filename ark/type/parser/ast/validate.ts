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
	NumberLiteral,
	typeToString,
	writeMalformedNumericLiteralMessage
} from "@ark/util"
import type { Generic } from "../../generic.ts"
import type { Comparator } from "../reduce/shared.ts"
import type { writeInvalidGenericArgCountMessage } from "../shift/operand/genericArgs.ts"
import type { UnitLiteral } from "../shift/operator/default.ts"
import type { parseString } from "../string.ts"
import type { validateRange } from "./bounds.ts"
import type { validateDefault } from "./default.ts"
import type { validateDivisor } from "./divisor.ts"
import type {
	DefAst,
	GenericInstantiationAst,
	inferAstRoot,
	InferredAst,
	InfixExpression,
	PostfixExpression
} from "./infer.ts"
import type { validateKeyof } from "./keyof.ts"
import type { astToString } from "./utils.ts"

export type validateAst<ast, $, args> =
	ast extends ErrorMessage ? ast
	: ast extends InferredAst ? validateInferredAst<ast[0], ast[2]>
	: ast extends DefAst ?
		ast[2] extends PrivateDeclaration ?
			ErrorMessage<writePrefixedPrivateReferenceMessage<ast[2]>>
		:	undefined
	: ast extends PostfixExpression<infer operator, infer operand> ?
		operator extends "[]" ? validateAst<operand, $, args>
		: operator extends "?" ? validateAst<operand, $, args>
		: never
	: ast extends InfixExpression<infer operator, infer l, infer r> ?
		operator extends "&" | "|" ? validateInfix<ast, $, args>
		: operator extends Comparator ? validateRange<l, operator, r, $, args>
		: operator extends "%" ? validateDivisor<l, $, args>
		: operator extends "=" ? validateDefault<l, r & UnitLiteral, $, args>
		: never
	: ast extends ["keyof", infer operand] ? validateKeyof<operand, $, args>
	: ast extends GenericInstantiationAst<infer g, infer argAsts> ?
		validateGenericArgs<g["paramsAst"], argAsts, $, args, []>
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

type validateInferredAst<inferred, def extends string> =
	def extends NumberLiteral ?
		number extends inferred ?
			ErrorMessage<writeMalformedNumericLiteralMessage<def, "number">>
		:	undefined
	: def extends BigintLiteral ?
		bigint extends inferred ?
			ErrorMessage<writeMalformedNumericLiteralMessage<def, "bigint">>
		:	undefined
	: [inferred] extends [anyOrNever] ? undefined
	: def extends PrivateDeclaration ?
		ErrorMessage<writePrefixedPrivateReferenceMessage<def>>
	: // these problems would've been caught during a fullStringParse, but it's most
	// efficient to check for them here in case the string was naively parsed
	inferred extends Generic ?
		ErrorMessage<writeInvalidGenericArgCountMessage<def, inferred["names"], []>>
	: inferred extends { [arkKind]: "module" } ?
		"root" extends keyof inferred ?
			undefined
		:	ErrorMessage<writeMissingSubmoduleAccessMessage<def>>
	: def extends ErrorMessage ? def
	: undefined

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
