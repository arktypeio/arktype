import { rootSchema } from "@ark/schema"
import {
	isKeyOf,
	throwParseError,
	type ErrorMessage,
	type Scanner
} from "@ark/util"
import type { Regex, regex } from "arkregex"
import type { Out } from "../../../attributes.ts"
import type { InferredAst } from "../../ast/infer.ts"
import type { RuntimeState } from "../../reduce/dynamic.ts"
import type { StaticState, s } from "../../reduce/static.ts"
import { tryParseDate, writeInvalidDateMessage } from "./date.ts"

export type StringLiteral<contents extends string = string> =
	| DoubleQuotedStringLiteral<contents>
	| SingleQuotedStringLiteral<contents>

export type DoubleQuotedStringLiteral<contents extends string = string> =
	`"${contents}"`

export type SingleQuotedStringLiteral<contents extends string = string> =
	`'${contents}'`

const regexExecArray = rootSchema({
	proto: "Array",
	sequence: "string",
	required: {
		key: "groups",
		value: ["object", { unit: undefined }]
	}
})

export const parseEnclosed = (
	s: RuntimeState,
	enclosing: EnclosingStartToken
): void => {
	const enclosed = s.scanner.shiftUntilEscapable(
		untilLookaheadIsClosing[enclosingTokens[enclosing]]
	)
	if (s.scanner.lookahead === "")
		return s.error(writeUnterminatedEnclosedMessage(enclosed, enclosing))

	// Shift the scanner one additional time for the second enclosing token
	s.scanner.shift()
	if (enclosing in enclosingRegexTokens) {
		let regex: RegExp

		try {
			regex = new RegExp(enclosed)
		} catch (e) {
			throwParseError(String(e))
		}

		s.root = s.ctx.$.node(
			"intersection",
			{
				domain: "string",
				pattern: enclosed
			},
			{ prereduced: true }
		)

		if (enclosing === "x/") {
			s.root = s.ctx.$.node("morph", {
				in: s.root,
				morphs: (s: string) => regex.exec(s),
				declaredOut: regexExecArray
			})
		}
	} else if (isKeyOf(enclosing, enclosingQuote))
		s.root = s.ctx.$.node("unit", { unit: enclosed })
	else {
		const date = tryParseDate(enclosed, writeInvalidDateMessage(enclosed))
		s.root = s.ctx.$.node("unit", { meta: enclosed, unit: date })
	}
}

export type parseEnclosed<
	s extends StaticState,
	enclosingStart extends EnclosingStartToken,
	unscanned extends string
> =
	Scanner.shiftUntilEscapable<
		unscanned,
		EnclosingTokens[enclosingStart],
		""
	> extends Scanner.shiftResult<infer scanned, infer nextUnscanned> ?
		_parseEnclosed<s, enclosingStart, scanned, nextUnscanned>
	:	never

type _parseEnclosed<
	s extends StaticState,
	enclosingStart extends EnclosingStartToken,
	scanned extends string,
	nextUnscanned extends string,
	def extends
		string = `${enclosingStart}${scanned}${EnclosingTokens[enclosingStart]}`
> =
	nextUnscanned extends "" ?
		s.error<writeUnterminatedEnclosedMessage<scanned, enclosingStart>>
	: enclosingStart extends EnclosingQuote ?
		s.setRoot<
			s,
			InferredAst<scanned, def>,
			nextUnscanned extends Scanner.shift<string, infer unscanned> ? unscanned
			:	""
		>
	: enclosingStart extends EnclosingRegexToken ?
		regex.parse<scanned> extends infer r ?
			r extends Regex ?
				s.setRoot<
					s,
					InferredAst<
						enclosingStart extends "/" ? r["infer"]
						:	(In: r["infer"]) => Out<r["inferExecArray"]>,
						def
					>,
					nextUnscanned extends Scanner.shift<string, infer unscanned> ?
						unscanned
					:	""
				>
			: r extends ErrorMessage<infer e> ? s.error<e>
			: never
		:	never
	:	s.setRoot<
			s,
			InferredAst<Date, def>,
			nextUnscanned extends Scanner.shift<string, infer unscanned> ? unscanned
			:	""
		>

export const enclosingQuote = {
	"'": 1,
	'"': 1
} as const

export type EnclosingQuote = keyof typeof enclosingQuote

export const enclosingChar = {
	"/": 1,
	"'": 1,
	'"': 1
} as const

export const enclosingLiteralTokens = {
	"d'": "'",
	'd"': '"',
	"'": "'",
	'"': '"'
} as const

export type EnclosingLiteralTokens = typeof enclosingLiteralTokens
export type EnclosingLiteralStartToken = keyof EnclosingLiteralTokens

export const enclosingRegexTokens = {
	"/": "/",
	"x/": "/"
} as const

export type EnclosingRegexTokens = typeof enclosingRegexTokens
export type EnclosingRegexToken = keyof EnclosingRegexTokens

export const enclosingTokens = {
	...enclosingLiteralTokens,
	...enclosingRegexTokens
} as const

export type EnclosingTokens = typeof enclosingTokens

export type EnclosingStartToken = keyof EnclosingTokens

export type EnclosingEndToken = EnclosingTokens[keyof EnclosingTokens]

export const untilLookaheadIsClosing: Record<
	EnclosingEndToken,
	Scanner.UntilCondition
> = {
	"'": scanner => scanner.lookahead === `'`,
	'"': scanner => scanner.lookahead === `"`,
	"/": scanner => scanner.lookahead === `/`
}

const enclosingCharDescriptions = {
	'"': "double-quote",
	"'": "single-quote",
	"/": "forward slash"
} as const

type enclosingCharDescriptions = typeof enclosingCharDescriptions

export const writeUnterminatedEnclosedMessage = <
	fragment extends string,
	enclosingStart extends EnclosingStartToken
>(
	fragment: fragment,
	enclosingStart: enclosingStart
): writeUnterminatedEnclosedMessage<fragment, enclosingStart> =>
	`${enclosingStart}${fragment} requires a closing ${
		enclosingCharDescriptions[enclosingTokens[enclosingStart]]
	}`

export type writeUnterminatedEnclosedMessage<
	fragment extends string,
	enclosingStart extends EnclosingStartToken
> = `${enclosingStart}${fragment} requires a closing ${enclosingCharDescriptions[EnclosingTokens[enclosingStart]]}`
