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
	Completion,
	ErrorMessage,
	NumberLiteral,
	typeToString,
	writeMalformedNumericLiteralMessage
} from "@ark/util"
import type { Generic } from "../../generic.ts"
import type {
	DefaultablePropertyDefinition,
	OptionalPropertyDefinition
} from "../property.ts"
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
		ast[2] extends PrivateDeclaration<infer name> ?
			ErrorMessage<writePrefixedPrivateReferenceMessage<name>>
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
		: operator extends "#" ? validateAst<l, $, args>
		: ErrorMessage<writeUnexpectedExpressionMessage<astToString<ast>>>
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

export const writePrefixedPrivateReferenceMessage = <name extends string>(
	name: name
): writePrefixedPrivateReferenceMessage<name> =>
	`Private type references should not include '#'. Use '${name}' instead.`

export type writePrefixedPrivateReferenceMessage<name extends string> =
	`Private type references should not include '#'. Use '${name}' instead.`

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
	: def extends PrivateDeclaration<infer name> ?
		ErrorMessage<writePrefixedPrivateReferenceMessage<name>>
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

export type validateString<
	def extends string,
	$,
	args,
	definitionDepth extends "shallow" | "deep"
> =
	parseString<def, $, args> extends infer ast ?
		validateAst<ast, $, args> extends infer result extends ErrorMessage ?
			// completions have the same suffix as error messages as a sentinel
			// but don't want to include that in what TS suggests
			result extends Completion<infer text> ?
				text
			:	result
		: definitionDepth extends "shallow" ?
			ast extends DefaultablePropertyDefinition ?
				ErrorMessage<shallowDefaultableMessage>
			: ast extends OptionalPropertyDefinition ?
				ErrorMessage<shallowOptionalMessage>
			:	// return the original definition when valid to allow it
				def
		:	def
	:	never

type validateInfix<ast extends InfixExpression, $, args> =
	validateAst<ast[0], $, args> extends infer e extends ErrorMessage ? e
	: validateAst<ast[2], $, args> extends infer e extends ErrorMessage ? e
	: undefined

export const shallowOptionalMessage =
	"Optional definitions like 'string?' are only valid as properties in an object or tuple"

export type shallowOptionalMessage = typeof shallowOptionalMessage

export const shallowDefaultableMessage =
	"Defaultable definitions like 'number = 0' are only valid as properties in an object or tuple"

export type shallowDefaultableMessage = typeof shallowDefaultableMessage
