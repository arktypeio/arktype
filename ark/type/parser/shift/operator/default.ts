import type { BaseRoot } from "@ark/schema"
import type {
	BigintLiteral,
	ErrorMessage,
	NumberLiteral,
	Scanner,
	trim
} from "@ark/util"
import type { type } from "../../../keywords/keywords.ts"
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

// "[]" can't resolve via type.infer (it would be the empty-group type `never`,
// not never[]), so it's special-cased. Unit literals are self-contained, so
// unscoped type.infer is safe for them.
export type inferDefaultLiteral<literal> =
	literal extends "[]" ? never[] : type.infer<literal>

export type ParsedDefaultableProperty = readonly [BaseRoot, "=", unknown]

export const parseDefault = (
	s: RootedRuntimeState
): ParsedDefaultableProperty => {
	// store the node that will be bounded
	const baseNode = s.unsetRoot()
	// "[]" is the only non-unit default currently supported and must be
	// represented as a thunk so each traversal gets a fresh array
	s.scanner.shiftUntilNonWhitespace()
	if (s.scanner.unscanned.startsWith("[]")) {
		s.scanner.jumpForward(2)
		return [baseNode, "=", () => []]
	}
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
		defaultExpression extends "[]" ? [root, "=", "[]"]
		: defaultExpression extends UnenclosedUnitLiteral ?
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
