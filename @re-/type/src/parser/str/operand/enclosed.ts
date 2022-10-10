import { keySet } from "@re-/tools"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import { RegexLiteral } from "../../../nodes/terminal/regexLiteral.js"
import { throwParseError } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"

export namespace Enclosed {
    export const parse = (s: ParserState.Base, enclosing: StartChar) => {
        const token = s.scanner.shiftUntil(untilLookaheadIsClosing[enclosing], {
            appendTo: enclosing,
            inclusive: true,
            onInputEnd: throwUnterminatedEnclosed
        })
        const enclosedText = token.slice(1, -1)
        s.root =
            enclosing === "/"
                ? new RegexLiteral.Node(token as RegexLiteral.Definition)
                : new PrimitiveLiteral.Node(
                      token as PrimitiveLiteral.String,
                      enclosedText
                  )
        return s
    }

    export type parse<
        s extends ParserState.T.Unfinished,
        enclosing extends StartChar,
        unscanned extends string
    > = Scanner.shiftUntil<unscanned, enclosing> extends Scanner.ShiftResult<
        infer scanned,
        infer nextUnscanned
    >
        ? nextUnscanned extends ""
            ? ParserState.error<
                  buildUnterminatedMessage<s["unscanned"], enclosing>
              >
            : ParserState.setRoot<
                  s,
                  `${enclosing}${scanned}${enclosing}`,
                  Scanner.tailOf<nextUnscanned>
              >
        : never

    export const startChars = keySet({
        "'": 1,
        '"': 1,
        "/": 1
    })

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
