import type { BaseRoot, DateLiteral } from "@arktype/schema"
import type {
	BigintLiteral,
	ErrorMessage,
	NumberLiteral,
	trim
} from "@arktype/util"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.js"
import type { StringLiteral } from "../operand/enclosed.js"

const unitLiteralKeywords = {
	null: null,
	undefined,
	true: true,
	false: false
} as const

type UnitLiteralKeyword = keyof typeof unitLiteralKeywords

export type UnitLiteral =
	| StringLiteral
	| BigintLiteral
	| NumberLiteral
	| DateLiteral
	| UnitLiteralKeyword

export type ParsedDefault = [BaseRoot, "=", unknown]

export const parseDefault = (s: DynamicStateWithRoot): ParsedDefault => {
	// store the node that will be bounded
	const baseNode = s.unsetRoot()
	s.parseOperand()
	const defaultNode = s.unsetRoot()
	// after parsing the next operand, use the locations to get the
	// token from which it was parsed
	if (!defaultNode.hasKind("unit"))
		return s.error(writeInvalidDefaultValueMessage(defaultNode.expression))

	// assignability is checked in parseEntries

	return [baseNode, "=", defaultNode.unit]
}

export type parseDefault<root, unscanned extends string> =
	// default values must always appear at the end of a string definition,
	// so parse the rest of the string and ensure it is a valid unit literal
	trim<unscanned> extends infer defaultValue extends UnitLiteral ?
		[root, "=", defaultValue]
	:	ErrorMessage<writeInvalidDefaultValueMessage<trim<unscanned>>>

export type writeInvalidDefaultValueMessage<defaultDef extends string> =
	`Default value '${defaultDef}' must a literal value`

export const writeInvalidDefaultValueMessage = <defaultDef extends string>(
	defaultDef: defaultDef
): writeInvalidDefaultValueMessage<defaultDef> =>
	`Default value '${defaultDef}' must a literal value`
