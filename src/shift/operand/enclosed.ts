import type { DynamicState } from "../../reduce/dynamic.js"
import { throwParseError } from "../../reduce/errors.js"
import type { Scanner } from "../../reduce/scanner.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { RegexLiteral } from "../../utils/generics.js"

export type StringLiteral<Text extends string = string> =
    | DoubleQuotedStringLiteral<Text>
    | SingleQuotedStringLiteral<Text>

export type DoubleQuotedStringLiteral<Text extends string = string> =
    `"${Text}"`

export type SingleQuotedStringLiteral<Text extends string = string> =
    `'${Text}'`

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
        ? state.throws<
              buildUnterminatedEnclosedMessage<s["unscanned"], enclosing>
          >
        : state.setRoot<
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

const untilLookaheadIsClosing: Record<EnclosingChar, Scanner.UntilCondition> = {
    "'": (scanner) => scanner.lookahead === `'`,
    '"': (scanner) => scanner.lookahead === `"`,
    "/": (scanner) => scanner.lookahead === `/`
}

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

const throwUnterminatedEnclosed: Scanner.OnInputEndFn = (scanner, shifted) =>
    throwParseError(
        buildUnterminatedEnclosedMessage(shifted, shifted[0] as EnclosingChar)
    )
