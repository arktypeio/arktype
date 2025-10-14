import type { BaseRoot } from "@ark/schema"
import type {
	BigintLiteral,
	ErrorMessage,
	NumberLiteral,
	Scanner,
	trim
} from "@ark/util"
import type { DateLiteral } from "../../../attributes.ts"
import type { RootedRuntimeState } from "../../reduce/dynamic.ts"
import type {
	EnclosingLiteralStartToken,
	EnclosingLiteralTokens,
	StringLiteral
} from "../operand/enclosed.ts"

type UnitLiteralKeyword = "null" | "undefined" | "true" | "false"

export type UnitLiteral = UnenclosedUnitLiteral | EnclosedUnitLiteral

export type UnenclosedUnitLiteral =
	| BigintLiteral
	| NumberLiteral
	| UnitLiteralKeyword

export type EnclosedUnitLiteral = StringLiteral | DateLiteral

export type ParsedDefaultableProperty = readonly [BaseRoot, "=", unknown]

export const parseDefault = (
	s: RootedRuntimeState
): ParsedDefaultableProperty => {
	// store the node that will be bounded
	const baseNode = s.unsetRoot()
	s.parseOperand()
	const defaultNode = s.unsetRoot()
	// after parsing the next operand, use the locations to get the
	// token from which it was parsed
	if (!defaultNode.hasKind("unit"))
		return s.error(writeNonLiteralDefaultMessage(defaultNode.expression))
	const defaultValue =
		defaultNode.unit instanceof Date ?
			() => new Date(defaultNode.unit as Date)
		:	defaultNode.unit
	return [baseNode, "=", defaultValue]
}

export type parseDefault<root, unscanned extends string> =
	// default values must always appear at the end of a string definition,
	// so parse the rest of the string and ensure it is a valid unit literal
	trim<unscanned> extends infer defaultExpression extends string ?
		defaultExpression extends UnenclosedUnitLiteral ?
			[root, "=", defaultExpression]
		: defaultExpression extends (
			`${infer start extends EnclosingLiteralStartToken}${string}`
		) ?
			defaultExpression extends `${start}${infer nextUnscanned}` ?
				isValidEnclosedLiteral<start, nextUnscanned> extends true ?
					[root, "=", defaultExpression]
				:	ErrorMessage<writeNonLiteralDefaultMessage<defaultExpression>>
			:	never
		:	ErrorMessage<writeNonLiteralDefaultMessage<defaultExpression>>
	:	never

export type isValidEnclosedLiteral<
	start extends EnclosingLiteralStartToken,
	unscanned extends string
> =
	Scanner.shiftUntilEscapable<
		unscanned,
		EnclosingLiteralTokens[start],
		""
	> extends Scanner.shiftResult<string, infer nextUnscanned> ?
		nextUnscanned extends EnclosingLiteralTokens[start] ?
			true
		:	false
	:	false

export const writeNonLiteralDefaultMessage = <defaultDef extends string>(
	defaultDef: defaultDef
): writeNonLiteralDefaultMessage<defaultDef> =>
	`Default value '${defaultDef}' must be a literal value`

export type writeNonLiteralDefaultMessage<defaultDef extends string> =
	`Default value '${defaultDef}' must be a literal value`
