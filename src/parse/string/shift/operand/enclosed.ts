import { parseTypeNode } from "../../../../nodes/type.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"

export type StringLiteral<Text extends string = string> =
    | DoubleQuotedStringLiteral<Text>
    | SingleQuotedStringLiteral<Text>

export type DoubleQuotedStringLiteral<Text extends string = string> =
    `"${Text}"`

export type SingleQuotedStringLiteral<Text extends string = string> =
    `'${Text}'`

export const parseEnclosed = (s: DynamicState, enclosing: EnclosingChar) => {
    const token = s.scanner.shiftUntil(untilLookaheadIsClosing[enclosing])
    if (s.scanner.lookahead === "") {
        return s.error(writeUnterminatedEnclosedMessage(token, enclosing))
    }
    // Shift the scanner one additional time for the second enclosing token
    if (s.scanner.shift() === "/") {
        s.root = parseTypeNode({ basis: "string", regex: token })
    } else {
        s.root = parseTypeNode({ basis: ["===", token] })
    }
}

export type parseEnclosed<
    s extends StaticState,
    enclosing extends EnclosingChar,
    unscanned extends string
> = Scanner.shiftUntil<unscanned, enclosing> extends Scanner.shiftResult<
    infer scanned,
    infer nextUnscanned
>
    ? nextUnscanned extends ""
        ? state.error<writeUnterminatedEnclosedMessage<scanned, enclosing>>
        : state.setRoot<
              s,
              `${enclosing}${scanned}${enclosing}`,
              nextUnscanned extends Scanner.shift<string, infer unscanned>
                  ? unscanned
                  : ""
          >
    : never

export const enclosingChar = {
    "'": 1,
    '"': 1,
    "/": 1
}

export type EnclosingChar = keyof typeof enclosingChar

const untilLookaheadIsClosing: Record<EnclosingChar, Scanner.UntilCondition> = {
    "'": (scanner) => scanner.lookahead === `'`,
    '"': (scanner) => scanner.lookahead === `"`,
    "/": (scanner) => scanner.lookahead === `/`
}

const enclosingCharDescriptions = {
    '"': "double-quote",
    "'": "single-quote",
    "/": "forward slash"
} as const

type enclosingCharDescriptions = typeof enclosingCharDescriptions

export const writeUnterminatedEnclosedMessage = <
    fragment extends string,
    enclosing extends EnclosingChar
>(
    fragment: fragment,
    enclosing: enclosing
): writeUnterminatedEnclosedMessage<fragment, enclosing> =>
    `${enclosing}${fragment} requires a closing ${enclosingCharDescriptions[enclosing]}`

type writeUnterminatedEnclosedMessage<
    fragment extends string,
    enclosing extends EnclosingChar
> = `${enclosing}${fragment} requires a closing ${enclosingCharDescriptions[enclosing]}`
