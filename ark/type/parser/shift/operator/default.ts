import type { BaseRoot } from "@ark/schema"
import {
	keysOf,
	tryParseWellFormedBigint,
	tryParseWellFormedNumber,
	whitespaceChars,
	type BigintLiteral,
	type ErrorMessage,
	type NumberLiteral,
	type Scanner,
	type trim
} from "@ark/util"
import type { type } from "../../../keywords/keywords.ts"
import type { DateLiteral } from "../../../attributes.ts"
import type { RootedRuntimeState } from "../../reduce/dynamic.ts"
import {
	parseEnclosed,
	type EnclosingLiteralStartToken,
	type EnclosingLiteralTokens,
	type EnclosingStartToken,
	type StringLiteral
} from "../operand/enclosed.ts"

type UnitLiteralKeyword = "null" | "undefined" | "true" | "false"

export type UnitLiteral = UnenclosedUnitLiteral | EnclosedUnitLiteral

export type UnenclosedUnitLiteral =
	| BigintLiteral
	| NumberLiteral
	| UnitLiteralKeyword

export type EnclosedUnitLiteral = StringLiteral | DateLiteral

/**
 * Unlike a unit literal, an empty collection can't be reused across traversals
 * since mutating the defaulted value would leak into subsequent ones. These are
 * parsed to a thunk instead, mirroring `["string[]", "=", () => []]`.
 */
export type EmptyCollectionLiteral = "[]" | "{}"

/**
 * A `[...]` default whose elements are unit literals. Like `[]`, the runtime
 * value is a thunk so each traversal receives a fresh array.
 */
export type UnitLiteralArrayLiteral = `[${string}]`

export type DefaultLiteral =
	| UnitLiteral
	| EmptyCollectionLiteral
	| UnitLiteralArrayLiteral

const emptyCollectionDefaults = {
	"[]": () => [],
	"{}": () => ({})
} as const satisfies {
	[literal in EmptyCollectionLiteral]: () => inferDefaultLiteral<literal>
}

const emptyCollectionLiterals = keysOf(emptyCollectionDefaults)

// neither empty collection literal can resolve via type.infer- "[]" would be
// parsed as the empty group type `never` rather than a literal `[]`, and "{}"
// isn't parseable at all- so each is special-cased here to its literal type.
// Unit literals are self-contained, so unscoped type.infer is safe for them.
export type inferDefaultLiteral<literal> =
	literal extends "[]" ? []
	: literal extends "{}" ? {}
	: literal extends UnitLiteralArrayLiteral ? inferUnitLiteralArray<literal>
	: type.infer<literal>

export type ParsedDefaultableProperty = readonly [BaseRoot, "=", unknown]

export const parseDefault = (
	s: RootedRuntimeState
): ParsedDefaultableProperty => {
	// store the node that will be bounded
	const baseNode = s.unsetRoot()
	// an empty collection is not a unit literal, so it must be short-circuited
	// here and represented as a thunk to keep each traversal's default distinct
	s.scanner.shiftUntilNonWhitespace()
	const emptyCollection = emptyCollectionLiterals.find(literal =>
		s.scanner.unscanned.startsWith(literal)
	)
	if (emptyCollection !== undefined) {
		s.scanner.jumpForward(emptyCollection.length)
		return [baseNode, "=", emptyCollectionDefaults[emptyCollection]]
	}
	// a non-empty list (or `[ ]`) is not a unit literal. `[` would otherwise
	// fail as a missing expression, so parse unit elements here and thunk the
	// result the same way `[]` does.
	if (s.scanner.lookahead === "[") {
		const elements = parseUnitLiteralArray(s)
		return [
			baseNode,
			"=",
			() => elements.map(element => cloneDefaultElement(element))
		]
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
	// or a unit-literal array. skipWhitespace (not trim) so `[ 1 , 2 ]` is
	// recognized even when more than one space precedes it.
	Scanner.skipWhitespace<unscanned> extends `[${infer afterOpen}` ?
		parseUnitLiteralArray<afterOpen> extends ParsedUnitLiteralArray ?
			[root, "=", UnitLiteralArrayLiteral & `[${afterOpen}`]
		:	ErrorMessage<writeNonLiteralDefaultMessage<`[${afterOpen}`>>
	: trim<unscanned> extends infer defaultExpression extends string ?
		defaultExpression extends UnenclosedUnitLiteral | EmptyCollectionLiteral ?
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

const cloneDefaultElement = (element: unknown): unknown =>
	element instanceof Date ? new Date(element) : element

const parseUnitLiteralArray = (s: RootedRuntimeState): unknown[] => {
	const arrayStart = s.scanner.location
	// consume "["
	s.scanner.shift()
	const elements: unknown[] = []
	while (true) {
		s.scanner.shiftUntilNonWhitespace()
		if (s.scanner.lookahead === "]") {
			s.scanner.shift()
			return elements
		}
		if (elements.length !== 0 && s.scanner.lookahead === "")
			return failUnitLiteralArray(s, arrayStart)
		elements.push(parseUnitLiteralElement(s, arrayStart))
		s.scanner.shiftUntilNonWhitespace()
		if (s.scanner.lookahead === ",") {
			s.scanner.shift()
			continue
		}
		if (s.scanner.lookahead === "]") {
			s.scanner.shift()
			return elements
		}
		return failUnitLiteralArray(s, arrayStart)
	}
}

const failUnitLiteralArray = (
	s: RootedRuntimeState,
	arrayStart: number
): never =>
	s.error(
		writeNonLiteralDefaultMessage(s.scanner.sliceChars(arrayStart).trim())
	)

const parseUnitLiteralElement = (
	s: RootedRuntimeState,
	arrayStart: number
): unknown => {
	const lookahead = s.scanner.lookahead
	if (lookahead === "'" || lookahead === '"') {
		parseEnclosed(s, s.scanner.shift())
		return s.unsetRoot()!.unit
	}
	if (
		lookahead === "d" &&
		(s.scanner.nextLookahead === "'" || s.scanner.nextLookahead === '"')
	) {
		parseEnclosed(
			s,
			`${s.scanner.shift()}${s.scanner.shift()}` as EnclosingStartToken
		)
		return s.unsetRoot()!.unit
	}
	const token = s.scanner.shiftUntil(
		scanner =>
			scanner.lookahead === "," ||
			scanner.lookahead === "]" ||
			scanner.lookahead in whitespaceChars
	)
	if (token === "null") return null
	if (token === "undefined") return undefined
	if (token === "true") return true
	if (token === "false") return false
	if (token === "") return failUnitLiteralArray(s, arrayStart)
	const maybeNumber = tryParseWellFormedNumber(token)
	if (maybeNumber !== undefined) return maybeNumber
	const maybeBigint = tryParseWellFormedBigint(token)
	if (maybeBigint !== undefined) return maybeBigint
	return failUnitLiteralArray(s, arrayStart)
}

type ParsedUnitElement<value, rest extends string> = {
	value: value
	rest: rest
}

type ParsedUnitLiteralArray<
	elements extends readonly unknown[] = readonly unknown[]
> = {
	elements: elements
}

type FailedUnitParse = { error: true }

type inferEnclosedElement<
	start extends EnclosingLiteralStartToken,
	scanned extends string
> =
	start extends "'" | '"' ? scanned
	: start extends `d${"'" | '"'}` ? Date
	: never

type inferUnenclosedElement<token extends string> =
	token extends "null" ? null
	: token extends "undefined" ? undefined
	: token extends "true" ? true
	: token extends "false" ? false
	: token extends NumberLiteral<infer n> ?
		number extends n ?
			never
		:	n
	: token extends BigintLiteral<infer b> ?
		bigint extends b ?
			never
		:	b
	:	never

type parseUnitElement<unscanned extends string> =
	unscanned extends (
		`${infer start extends EnclosingLiteralStartToken}${infer next}`
	) ?
		Scanner.shiftUntilEscapable<
			next,
			EnclosingLiteralTokens[start],
			""
		> extends (
			Scanner.shiftResult<infer scanned extends string, infer nextUnscanned>
		) ?
			nextUnscanned extends `${EnclosingLiteralTokens[start]}${infer rest}` ?
				inferEnclosedElement<start, scanned> extends infer value ?
					[value] extends [never] ?
						FailedUnitParse
					:	ParsedUnitElement<value, rest>
				:	FailedUnitParse
			:	FailedUnitParse
		:	FailedUnitParse
	: Scanner.shiftUntil<unscanned, "," | "]" | " " | "\n" | "\t"> extends (
		Scanner.shiftResult<infer token extends string, infer rest>
	) ?
		inferUnenclosedElement<token> extends infer value ?
			[value] extends [never] ?
				FailedUnitParse
			:	ParsedUnitElement<value, rest>
		:	FailedUnitParse
	:	FailedUnitParse

type parseUnitLiteralArray<
	unscanned extends string,
	acc extends readonly unknown[] = []
> =
	Scanner.skipWhitespace<unscanned> extends `]${infer rest}` ?
		Scanner.skipWhitespace<rest> extends "" ?
			ParsedUnitLiteralArray<acc>
		:	FailedUnitParse
	: parseUnitElement<Scanner.skipWhitespace<unscanned>> extends (
		ParsedUnitElement<infer value, infer rest>
	) ?
		Scanner.skipWhitespace<rest> extends `,${infer afterComma}` ?
			parseUnitLiteralArray<afterComma, [...acc, value]>
		: Scanner.skipWhitespace<rest> extends `]${infer afterClose}` ?
			Scanner.skipWhitespace<afterClose> extends "" ?
				ParsedUnitLiteralArray<[...acc, value]>
			:	FailedUnitParse
		:	FailedUnitParse
	:	FailedUnitParse

type inferUnitLiteralArray<literal extends UnitLiteralArrayLiteral> =
	literal extends `[${infer afterOpen}` ?
		parseUnitLiteralArray<afterOpen> extends (
			ParsedUnitLiteralArray<infer elements>
		) ?
			elements
		:	never
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
