import { makeMorph, type BaseRoot } from "@ark/schema"
import {
	hasOwn,
	nonFiniteNumbers,
	tryParseWellFormedBigint,
	tryParseWellFormedNumber,
	whitespaceChars,
	type BigintLiteral,
	type ErrorMessage,
	type NonFiniteNumberLiteral,
	type NumberLiteral,
	type Scanner,
	type WhitespaceChar,
	type trim
} from "@ark/util"
import type { DateLiteral } from "../../../attributes.ts"
import {
	arrayDefault,
	emptyCollectionDefaults
} from "../../../keywords/functions.ts"
import type { inferDefinition } from "../../definition.ts"
import type { RootedRuntimeState } from "../../reduce/dynamic.ts"
import {
	enclosingQuote,
	parseEnclosed,
	type EnclosingLiteralStartToken,
	type EnclosingLiteralTokens,
	type EnclosingQuote,
	type StringLiteral
} from "../operand/enclosed.ts"

type UnitLiteralKeyword = "null" | "undefined" | "true" | "false"

export type UnitLiteral = UnenclosedUnitLiteral | EnclosedUnitLiteral

export type UnenclosedUnitLiteral =
	| BigintLiteral
	| NumberLiteral
	| NonFiniteNumberLiteral
	| UnitLiteralKeyword

export type EnclosedUnitLiteral = StringLiteral | DateLiteral

/**
 * Unlike a unit literal, an empty collection can't be reused across traversals
 * since mutating the defaulted value would leak into subsequent ones. These are
 * parsed to a thunk instead, mirroring `["string[]", "=", () => []]`.
 */
export type EmptyCollectionLiteral = "[]" | "{}"

export type ArrayLiteral = `[${string}]`

export type DefaultLiteral = UnitLiteral | EmptyCollectionLiteral | ArrayLiteral

const arrayElementTerminators = {
	",": 1,
	"]": 1,
	...whitespaceChars
} as const

const unitLiteralKeywords = {
	null: null,
	undefined,
	true: true,
	false: false
} as const

// collection literals can't resolve via inferDefinition- "[]" would be parsed
// as the empty tuple rather than a literal `[]`, "[...]" isn't a string-syntax
// tuple expression, and "{}" isn't parseable at all- so each is handled here.
// Unit literals are self-contained, so unscoped inferDefinition is safe for them.
export type inferDefaultLiteral<literal> =
	literal extends "[]" ? []
	: literal extends "{}" ? {}
	: literal extends `[${infer inner}` ? parseArrayDefault<inner>
	: inferDefinition<literal, {}, {}>

export type ParsedDefaultableProperty = readonly [BaseRoot, "=", unknown]

export const parseDefault = (
	s: RootedRuntimeState
): ParsedDefaultableProperty => {
	// store the node that will be bounded
	const baseNode = s.unsetRoot()
	// collection literals are not unit literals, so they must be short-circuited
	// here and represented as thunks to keep each traversal's default distinct
	s.sc.skipSpace()
	if (s.sc.unscanned.startsWith("{}")) {
		s.sc.jumpForward(2)
		return [baseNode, "=", emptyCollectionDefaults["{}"]]
	}
	if (s.sc.peek === "[") return [baseNode, "=", parseDefaultArray(s)]
	const start = s.sc.location
	s.parseOperand()
	const defaultNode = s.unsetRoot()
	// ( and keyof are operands that don't set a root
	if (!defaultNode?.is("unit")) {
		return s.error(
			writeNonLiteralDefaultMessage(
				defaultNode?.expression ?? s.sc.sliceChars(start).trim()
			)
		)
	}
	const defaultValue =
		defaultNode.unit instanceof Date ?
			() => new Date(defaultNode.unit as Date)
		:	defaultNode.unit
	return [baseNode, "=", defaultValue]
}

const parseDefaultArray = (s: RootedRuntimeState): (() => unknown[]) => {
	const arrayStart = s.sc.location
	// shift opening "["
	s.sc.shift()
	s.sc.skipSpace()
	if (s.sc.peek === "]") {
		s.sc.shift()
		return emptyCollectionDefaults["[]"]
	}
	const elements: unknown[] = []
	while (true) {
		s.sc.skipSpace()
		const peek = s.sc.peek
		if (peek in enclosingQuote) {
			parseEnclosed(s, s.sc.shift() as EnclosingQuote)
			const elemNode = s.unsetRoot()
			if (!elemNode.is("unit")) {
				return s.error(
					writeNonLiteralDefaultMessage(s.sc.sliceChars(arrayStart).trim())
				)
			}
			elements.push(elemNode.unit)
		} else if (peek === "d" && s.sc.peekNext in enclosingQuote) {
			parseEnclosed(
				s,
				`${s.sc.shift()}${s.sc.shift()}` as EnclosingLiteralStartToken
			)
			const elemNode = s.unsetRoot()
			if (!elemNode.is("unit")) {
				return s.error(
					writeNonLiteralDefaultMessage(s.sc.sliceChars(arrayStart).trim())
				)
			}
			elements.push(elemNode.unit)
		} else {
			const token = s.sc.shiftUntilNext(arrayElementTerminators)
			if (hasOwn(unitLiteralKeywords, token)) {
				elements.push(
					unitLiteralKeywords[token as keyof typeof unitLiteralKeywords]
				)
			} else if (hasOwn(nonFiniteNumbers, token))
				elements.push(nonFiniteNumbers[token as NonFiniteNumberLiteral])
			else {
				const maybeNumber = tryParseWellFormedNumber(token)
				if (maybeNumber !== undefined) elements.push(maybeNumber)
				else {
					const maybeBigint = tryParseWellFormedBigint(token)
					if (maybeBigint !== undefined) elements.push(maybeBigint)
					else {
						return s.error(
							writeNonLiteralDefaultMessage(s.sc.sliceChars(arrayStart).trim())
						)
					}
				}
			}
		}
		s.sc.skipSpace()
		if (s.sc.peek === ",") {
			s.sc.shift()
			continue
		}
		if (s.sc.peek === "]") {
			s.sc.shift()
			break
		}
		return s.error(
			writeNonLiteralDefaultMessage(s.sc.sliceChars(arrayStart).trim())
		)
	}
	return makeMorph(arrayDefault as never, elements) as () => unknown[]
}

export type parseDefault<root, unscanned extends string> =
	// default values must always appear at the end of a string definition,
	// so parse the rest of the string and ensure it is a valid unit literal
	trim<unscanned> extends infer defaultExpression extends string ?
		defaultExpression extends UnenclosedUnitLiteral | EmptyCollectionLiteral ?
			[root, "=", defaultExpression]
		: defaultExpression extends `[${infer inner}` ?
			parseArrayDefault<inner> extends unknown[] ?
				[root, "=", defaultExpression]
			:	ErrorMessage<writeNonLiteralDefaultMessage<defaultExpression>>
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

type parseArrayDefault<
	unscanned extends string,
	elements extends unknown[] = []
> =
	Scanner.skipWhitespace<unscanned> extends infer trimmed extends string ?
		trimmed extends "]" ?
			elements
		:	parseArrayDefaultElement<trimmed, elements>
	:	undefined

type parseArrayDefaultElement<unscanned extends string, acc extends unknown[]> =
	unscanned extends `d'${infer nextUnscanned}` ?
		parseArrayEnclosedElement<nextUnscanned, "'", true, acc>
	: unscanned extends `d"${infer nextUnscanned}` ?
		parseArrayEnclosedElement<nextUnscanned, '"', true, acc>
	: unscanned extends `'${infer nextUnscanned}` ?
		parseArrayEnclosedElement<nextUnscanned, "'", false, acc>
	: unscanned extends `"${infer nextUnscanned}` ?
		parseArrayEnclosedElement<nextUnscanned, '"', false, acc>
	: Scanner.shiftUntil<unscanned, "," | "]" | WhitespaceChar> extends (
		Scanner.shiftResult<infer token, infer rest>
	) ?
		inferUnenclosedUnitLiteral<token> extends [infer value] ?
			parseArrayDefaultAfterElement<
				Scanner.skipWhitespace<rest>,
				[...acc, value]
			>
		:	undefined
	:	undefined

type parseArrayEnclosedElement<
	unscanned extends string,
	closing extends EnclosingQuote,
	isDate extends boolean,
	acc extends unknown[]
> =
	Scanner.shiftUntilEscapable<unscanned, closing, ""> extends (
		Scanner.shiftResult<infer scanned, infer afterContent>
	) ?
		afterContent extends `${closing}${infer rest}` ?
			parseArrayDefaultAfterElement<
				Scanner.skipWhitespace<rest>,
				[...acc, isDate extends true ? Date : scanned]
			>
		:	undefined
	:	undefined

type parseArrayDefaultAfterElement<
	unscanned extends string,
	acc extends unknown[]
> =
	unscanned extends "]" ? acc
	: unscanned extends `,${infer afterComma}` ?
		parseArrayDefaultElement<Scanner.skipWhitespace<afterComma>, acc>
	:	undefined

type inferUnenclosedUnitLiteral<token extends string> =
	token extends "" ? undefined
	: token extends "true" ? [true]
	: token extends "false" ? [false]
	: token extends "null" ? [null]
	: token extends "undefined" ? [undefined]
	: token extends NonFiniteNumberLiteral ? [number]
	: token extends NumberLiteral<infer n> ?
		number extends n ? undefined
		: `${n}` extends token ? [n]
		: undefined
	: token extends BigintLiteral<infer b> ?
		bigint extends b ? undefined
		: `${b}n` extends token ? [b]
		: undefined
	:	undefined

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
