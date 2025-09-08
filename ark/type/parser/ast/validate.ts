import type {
	arkKind,
	PrivateDeclaration,
	writeMissingSubmoduleAccessMessage
} from "@ark/schema"
import type {
	anyOrNever,
	BigintLiteral,
	Completion,
	ErrorMessage,
	NumberLiteral,
	writeMalformedNumericLiteralMessage
} from "@ark/util"
import type { Generic } from "../../generic.ts"
import type { BranchOperator, Comparator } from "../reduce/shared.ts"
import type { writeInvalidGenericArgCountMessage } from "../shift/operand/genericArgs.ts"
import type { UnitLiteral } from "../shift/operator/default.ts"
import type { parseString } from "../string.ts"
import type { validateRange } from "./bounds.ts"
import type { validateDefault } from "./default.ts"
import type { validateDivisor } from "./divisor.ts"
import type {
	GenericInstantiationAst,
	validateGenericInstantiation
} from "./generic.ts"
import type {
	DefAst,
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
	: ast extends PostfixExpression<"[]" | "?", infer operand> ?
		// shallowOptionalMessage is handled in type.validate
		// invalidOptionalKeyKindMessage is handled in property parsing

		// it would be natural to handle them here by adding context
		// to the generic args, but it makes the cache less reusable
		// (was tested and had a significant impact on repo-wide perf)
		validateAst<operand, $, args>
	: ast extends InfixExpression<infer operator, infer l, infer r> ?
		operator extends BranchOperator ? validateInfix<ast, $, args>
		: operator extends Comparator ? validateRange<l, operator, r, $, args>
		: operator extends "%" ? validateDivisor<l, $, args>
		: // shallowDefaultableMessage is handled in type.validate
		// invalidDefaultableKeyKindMessage is handled in property parsing
		operator extends "=" ? validateDefault<l, r & UnitLiteral, $, args>
		: operator extends "#" ? validateAst<l, $, args>
		: ErrorMessage<writeUnexpectedExpressionMessage<astToString<ast>>>
	: ast extends ["keyof", infer operand] ? validateKeyof<operand, $, args>
	: ast extends GenericInstantiationAst<infer g, infer argAsts> ?
		validateGenericInstantiation<g, argAsts, $, args>
	:	ErrorMessage<writeUnexpectedExpressionMessage<astToString<ast>>> & {
			ast: ast
		}

type writeUnexpectedExpressionMessage<expression extends string> =
	`Failed to parse the expression resulting from ${expression}`

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

export type validateString<def extends string, $, args> =
	parseString<def, $, args> extends infer ast ?
		validateAst<ast, $, args> extends infer result extends ErrorMessage ?
			// completions have the same suffix as error messages as a sentinel
			// but don't want to include that in what TS suggests
			result extends Completion<infer text> ?
				text
			:	result
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
