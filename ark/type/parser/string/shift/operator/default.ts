import type { BaseRoot } from "@ark/schema"
import {
	throwParseError,
	type BigintLiteral,
	type ErrorMessage,
	type NumberLiteral,
	type trim
} from "@ark/util"
import type { DateLiteral } from "../../../../keywords/ast.ts"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.ts"
import type { StringLiteral } from "../operand/enclosed.ts"

type UnitLiteralKeyword = "null" | "undefined" | "true" | "false"

export type UnitLiteral =
	| StringLiteral
	| BigintLiteral
	| NumberLiteral
	| DateLiteral
	| UnitLiteralKeyword

export type ParsedDefault = [BaseRoot, "=", unknown]

export const parseDefault = (s: DynamicStateWithRoot): ParsedDefault => {
	if (!s.defaultable) return throwParseError(shallowDefaultMessage)

	// store the node that will be bounded
	const baseNode = s.unsetRoot()
	s.parseOperand()
	const defaultNode = s.unsetRoot()
	// after parsing the next operand, use the locations to get the
	// token from which it was parsed
	if (!defaultNode.hasKind("unit"))
		return s.error(writeNonLiteralDefaultMessage(defaultNode.expression))

	// assignability is checked in parseEntries

	return [baseNode, "=", defaultNode.unit]
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

export const shallowDefaultMessage = `Default values must be specified on objects like { isAdmin: 'boolean = false' }`

export type shallowDefaultMessage = typeof shallowDefaultMessage
