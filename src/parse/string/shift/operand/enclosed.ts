import type { error, tailOfString } from "../../../../utils/generics.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"

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
        s.setRoot({ string: { regex: token } })
    } else {
        s.setRoot({ string: { value: token } })
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
        ? error<writeUnterminatedEnclosedMessage<scanned, enclosing>>
        : state.setRoot<
              s,
              `${enclosing}${scanned}${enclosing}`,
              tailOfString<nextUnscanned>
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
