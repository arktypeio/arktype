import { keySet } from "@re-/tools"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import { RegexLiteral } from "../../../nodes/terminal/regexLiteral.js"
import type { Scanner, scanner } from "../state/scanner.js"
import type { ParserState } from "../state/state.js"

export namespace Enclosed {
    export const parse = (s: ParserState, enclosing: StartChar) => {
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
        s extends ParserState.T,
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

    export const buildUnterminatedMessage = <
        fragment extends string,
        enclosing extends StartChar
    >(
        fragment: fragment,
        enclosing: enclosing
    ): buildUnterminatedMessage<fragment, enclosing> =>
        `${fragment} requires a closing ${enclosing}`

    type buildUnterminatedMessage<
        fragment extends string,
        enclosing extends StartChar
    > = `${fragment} requires a closing ${enclosing}`

    const untilLookaheadIsClosing: Record<StartChar, scanner.UntilCondition> = {
        "'": (scanner) => scanner.lookahead === `'`,
        '"': (scanner) => scanner.lookahead === `"`,
        "/": (scanner) => scanner.lookahead === `/`
    }

    const throwUnterminatedEnclosed: scanner.OnInputEndFn = (
        scanner,
        shifted
    ) => {
        throw new Error(
            buildUnterminatedMessage(shifted, shifted[0] as StartChar)
        )
    }
}
