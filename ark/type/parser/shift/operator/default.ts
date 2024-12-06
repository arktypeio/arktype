import type { BaseRoot } from "@ark/schema"
import type {
	BigintLiteral,
	ErrorMessage,
	NumberLiteral,
	trim
} from "@ark/util"
import type { DateLiteral } from "../../../attributes.ts"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.ts"
import type { StringLiteral } from "../operand/enclosed.ts"

type UnitLiteralKeyword = "null" | "undefined" | "true" | "false"

export type UnitLiteral =
	| StringLiteral
	| BigintLiteral
	| NumberLiteral
	| DateLiteral
	| UnitLiteralKeyword

export const parseDefault = (s: DynamicStateWithRoot): BaseRoot => {
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
	return baseNode.withDefaultMeta(defaultValue)
}

export type parseDefault<root, unscanned extends string> =
	// default values must always appear at the end of a string definition,
	// so parse the rest of the string and ensure it is a valid unit literal
	trim<unscanned> extends infer defaultValue extends UnitLiteral ?
		[root, "=", defaultValue]
	:	ErrorMessage<writeNonLiteralDefaultMessage<trim<unscanned>>>

export const writeNonLiteralDefaultMessage = <defaultDef extends string>(
	defaultDef: defaultDef
): writeNonLiteralDefaultMessage<defaultDef> =>
	`Default value '${defaultDef}' must a literal value`

export type writeNonLiteralDefaultMessage<defaultDef extends string> =
	`Default value '${defaultDef}' must a literal value`
