import { throwParseError } from "../common.js"
import type { DynamicState } from "../state/dynamic.js"
import type { Scanner } from "../state/scanner.js"
import type { errorState, setStateRoot, StaticState } from "../state/static.js"

export type StringLiteral<Text extends string = string> =
    | DoubleQuotedStringLiteral<Text>
    | SingleQuotedStringLiteral<Text>

export type DoubleQuotedStringLiteral<Text extends string = string> =
    `"${Text}"`

export type SingleQuotedStringLiteral<Text extends string = string> =
    `'${Text}'`

export type RegexLiteral<Source extends string = string> = `/${Source}/`

export const parseEnclosed = (s: DynamicState, enclosing: EnclosingChar) => {
    const token = s.scanner.shiftUntil(untilLookaheadIsClosing[enclosing], {
        appendTo: enclosing,
        inclusive: true,
        onInputEnd: throwUnterminatedEnclosed
    })
    s.setRoot(
        enclosing === "/"
            ? { regex: token as RegexLiteral }
            : {
                  value:
                      enclosing === "'"
                          ? (token as SingleQuotedStringLiteral)
                          : `'${token.slice(1, -1)}'`
              }
    )
    return s
}

export type parseEnclosed<
    s extends StaticState,
    enclosing extends EnclosingChar,
    unscanned extends string
> = Scanner.shiftUntil<unscanned, enclosing> extends Scanner.ShiftResult<
    infer scanned,
    infer nextUnscanned
>
    ? nextUnscanned extends ""
        ? errorState<
              buildUnterminatedEnclosedMessage<s["unscanned"], enclosing>
          >
        : setStateRoot<
              s,
              `${enclosing}${scanned}${enclosing}`,
              Scanner.tailOf<nextUnscanned>
          >
    : never

export const enclosingChar = {
    "'": 1,
    '"': 1,
    "/": 1
}

export type EnclosingChar = keyof typeof enclosingChar

const enclosingCharDescriptions = {
    '"': "double-quote",
    "'": "single-quote",
    "/": "forward slash"
} as const

type enclosingCharDescriptions = typeof enclosingCharDescriptions

export const buildUnterminatedEnclosedMessage = <
    fragment extends string,
    enclosing extends EnclosingChar
>(
    fragment: fragment,
    enclosing: enclosing
): buildUnterminatedEnclosedMessage<fragment, enclosing> =>
    `${fragment} requires a closing ${enclosingCharDescriptions[enclosing]}`

type buildUnterminatedEnclosedMessage<
    fragment extends string,
    enclosing extends EnclosingChar
> = `${fragment} requires a closing ${enclosingCharDescriptions[enclosing]}`

const untilLookaheadIsClosing: Record<EnclosingChar, Scanner.UntilCondition> = {
    "'": (scanner) => scanner.lookahead === `'`,
    '"': (scanner) => scanner.lookahead === `"`,
    "/": (scanner) => scanner.lookahead === `/`
}

const throwUnterminatedEnclosed: Scanner.OnInputEndFn = (scanner, shifted) =>
    throwParseError(
        buildUnterminatedEnclosedMessage(shifted, shifted[0] as EnclosingChar)
    )
