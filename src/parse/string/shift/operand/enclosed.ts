import { typeNode } from "../../../../main.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"
import { getValidDateFromInputOrThrow } from "./date.js"

export type StringLiteral<Text extends string = string> =
    | DoubleQuotedStringLiteral<Text>
    | SingleQuotedStringLiteral<Text>

export type DoubleQuotedStringLiteral<Text extends string = string> =
    `"${Text}"`

export type SingleQuotedStringLiteral<Text extends string = string> =
    `'${Text}'`

export const parseEnclosed = (
    s: DynamicState,
    enclosing: StartEnclosingChar
) => {
    const token = s.scanner.shiftUntil(
        untilLookaheadIsClosing[
            openToCloseEnclosingChar[enclosing] as EndEnclosingChar
        ]
    )
    if (s.scanner.lookahead === "") {
        return s.error(writeUnterminatedEnclosedMessage(token, enclosing))
    }
    // Shift the scanner one additional time for the second enclosing token
    if (s.scanner.shift() === "/") {
        s.root = typeNode({ basis: "string", regex: token })
    } else {
        const value = /d['"]/.test(enclosing)
            ? getValidDateFromInputOrThrow(token)
            : token
        s.root = typeNode({ basis: ["===", value] })
    }
}

type getClosingEnclosed<enclosing extends StartEnclosingChar> =
    enclosing extends `d${infer quote extends QuoteEnclosingChar}`
        ? quote
        : enclosing

export type parseEnclosed<
    s extends StaticState,
    enclosing extends StartEnclosingChar,
    unscanned extends string
> = Scanner.shiftUntil<
    unscanned,
    getClosingEnclosed<enclosing>
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? nextUnscanned extends ""
        ? state.error<writeUnterminatedEnclosedMessage<scanned, enclosing>>
        : state.setRoot<
              s,
              `${enclosing}${scanned}${getClosingEnclosed<enclosing>}`,
              nextUnscanned extends Scanner.shift<string, infer unscanned>
                  ? unscanned
                  : ""
          >
    : never

export const quoteEnclosingChar = {
    "'": 1,
    '"': 1
}

export const enclosingChar = {
    "/": 1,
    ...quoteEnclosingChar
}

export const openToCloseEnclosingChar: { [k: string]: string } = {
    "d'": "'",
    'd"': '"',
    "'": "'",
    '"': '"',
    "/": "/"
}

const startingChars = {
    "d'": 1,
    'd"': 1,
    ...enclosingChar
}
export type StartEnclosingChar = keyof typeof startingChars
export type EndEnclosingChar = keyof typeof enclosingChar
export type QuoteEnclosingChar = keyof typeof quoteEnclosingChar

export const untilLookaheadIsClosing: Record<
    EndEnclosingChar,
    Scanner.UntilCondition
> = {
    "'": (scanner) => scanner.lookahead === `'`,
    '"': (scanner) => scanner.lookahead === `"`,
    "/": (scanner) => scanner.lookahead === `/`
}

const enclosingCharDescriptions: Record<string, string> = {
    '"': "double-quote",
    "'": "single-quote",
    "/": "forward slash"
} as const

type enclosingCharDescriptions = typeof enclosingCharDescriptions

export const writeUnterminatedEnclosedMessage = <
    fragment extends string,
    enclosing extends StartEnclosingChar
>(
    fragment: fragment,
    enclosing: enclosing
): writeUnterminatedEnclosedMessage<fragment, enclosing> =>
    `${enclosing}${fragment} requires a closing ${
        enclosingCharDescriptions[openToCloseEnclosingChar[enclosing]]
    }`

export type writeUnterminatedEnclosedMessage<
    fragment extends string,
    enclosing extends StartEnclosingChar
> = `${enclosing}${fragment} requires a closing ${enclosingCharDescriptions[getClosingEnclosed<enclosing>]}`
