import { isKeyOf, throwParseError } from "@ark/util"
import type { string } from "../../../../keywords/ast.ts"
import type { Date } from "../../../../keywords/constructors/Date.ts"
import type { InferredAst } from "../../../semantic/infer.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { StaticState, state } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"
import { tryParseDate, writeInvalidDateMessage } from "./date.ts"

export type StringLiteral<Text extends string = string> =
	| DoubleQuotedStringLiteral<Text>
	| SingleQuotedStringLiteral<Text>

export type DoubleQuotedStringLiteral<Text extends string = string> =
	`"${Text}"`

export type SingleQuotedStringLiteral<Text extends string = string> =
	`'${Text}'`

export const parseEnclosed = (
	s: DynamicState,
	enclosing: EnclosingStartToken
): void => {
	const enclosed = s.scanner.shiftUntil(
		untilLookaheadIsClosing[enclosingTokens[enclosing]]
	)
	if (s.scanner.lookahead === "")
		return s.error(writeUnterminatedEnclosedMessage(enclosed, enclosing))

	// Shift the scanner one additional time for the second enclosing token
	s.scanner.shift()
	if (enclosing === "/") {
		try {
			new RegExp(enclosed)
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
	Scanner.shiftUntil<unscanned, EnclosingTokens[enclosingStart]> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		nextUnscanned extends "" ?
			state.error<writeUnterminatedEnclosedMessage<scanned, enclosingStart>>
		:	state.setRoot<
				s,
				InferredAst<
					enclosingStart extends EnclosingQuote ? scanned
					: enclosingStart extends "/" ? string.matching<scanned>
					: Date.literal<scanned>,
					`${enclosingStart}${scanned}${EnclosingTokens[enclosingStart]}`
				>,
				nextUnscanned extends Scanner.shift<string, infer unscanned> ? unscanned
				:	""
			>
	:	never

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

export const enclosingTokens = {
	"d'": "'",
	'd"': '"',
	"'": "'",
	'"': '"',
	"/": "/"
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
