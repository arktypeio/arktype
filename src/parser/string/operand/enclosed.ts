import { Attributes } from "../../../attributes/attributes.js"
import { throwParseError } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { DynamicState, StaticState } from "../state/state.js"

export namespace Enclosed {
    export type StringLiteral<Text extends string = string> =
        | DoubleQuotedStringLiteral<Text>
        | SingleQuotedStringLiteral<Text>

    export type DoubleQuotedStringLiteral<Text extends string = string> =
        `"${Text}"`

    export type SingleQuotedStringLiteral<Text extends string = string> =
        `'${Text}'`

    export type RegexLiteral<Source extends string = string> = `/${Source}/`

    export const parse = (s: DynamicState, enclosing: StartChar) => {
        const token = s.scanner.shiftUntil(untilLookaheadIsClosing[enclosing], {
            appendTo: enclosing,
            inclusive: true,
            onInputEnd: throwUnterminatedEnclosed
        })
        s.root =
            enclosing === "/"
                ? Attributes.init("regex", new RegExp(token.slice(1, -1)))
                : Attributes.init("value", token.slice(1, -1))
        return s
    }

    export type parse<
        s extends StaticState,
        enclosing extends StartChar,
        unscanned extends string
    > = Scanner.shiftUntil<unscanned, enclosing> extends Scanner.ShiftResult<
        infer scanned,
        infer nextUnscanned
    >
        ? nextUnscanned extends ""
            ? StaticState.error<
                  buildUnterminatedMessage<s["unscanned"], enclosing>
              >
            : StaticState.setRoot<
                  s,
                  `${enclosing}${scanned}${enclosing}`,
                  Scanner.tailOf<nextUnscanned>
              >
        : never

    export const startChars = {
        "'": 1,
        '"': 1,
        "/": 1
    }

    export type StartChar = keyof typeof startChars

    const enclosingCharDescriptions = {
        '"': "double-quote",
        "'": "single-quote",
        "/": "forward slash"
    } as const

    type enclosingCharDescriptions = typeof enclosingCharDescriptions

    export const buildUnterminatedMessage = <
        fragment extends string,
        enclosing extends StartChar
    >(
        fragment: fragment,
        enclosing: enclosing
    ): buildUnterminatedMessage<fragment, enclosing> =>
        `${fragment} requires a closing ${enclosingCharDescriptions[enclosing]}`

    type buildUnterminatedMessage<
        fragment extends string,
        enclosing extends StartChar
    > = `${fragment} requires a closing ${enclosingCharDescriptions[enclosing]}`

    const untilLookaheadIsClosing: Record<StartChar, Scanner.UntilCondition> = {
        "'": (scanner) => scanner.lookahead === `'`,
        '"': (scanner) => scanner.lookahead === `"`,
        "/": (scanner) => scanner.lookahead === `/`
    }

    const throwUnterminatedEnclosed: Scanner.OnInputEndFn = (
        scanner,
        shifted
    ) =>
        throwParseError(
            buildUnterminatedMessage(shifted, shifted[0] as StartChar)
        )
}
