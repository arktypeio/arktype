import { keySet } from "@re-/tools"
import type { Base } from "../../../nodes/base.js"
import { StringNode } from "../../../nodes/terminal/keyword/string.js"
import type { Left } from "../state/left.js"
import type { Scanner, scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"

export namespace Enclosed {
    export const startChars = keySet({
        "'": 1,
        '"': 1,
        "/": 1
    })

    export type StartChar = keyof typeof startChars

    export type StringLiteralQuote = `'` | `"`

    export const unterminatedMessage = <
        Fragment extends string,
        Enclosing extends StartChar
    >(
        fragment: Fragment,
        enclosing: Enclosing
    ): UnterminatedMessage<Fragment, Enclosing> =>
        `${fragment} requires a closing ${enclosing}`

    type UnterminatedMessage<
        Fragment extends string,
        Enclosing extends StartChar
    > = `${Fragment} requires a closing ${Enclosing}`

    const untilLookaheadIsClosing: Record<StartChar, scanner.UntilCondition> = {
        "'": (scanner) => scanner.lookahead === `'`,
        '"': (scanner) => scanner.lookahead === `"`,
        "/": (scanner) => scanner.lookahead === `/`
    }

    export const parse = (
        s: parserState,
        enclosing: StartChar,
        context: Base.context
    ) => {
        const token = s.r.shiftUntil(untilLookaheadIsClosing[enclosing], {
            appendTo: enclosing,
            inclusive: true,
            onInputEnd: throwUnterminatedEnclosed
        })
        const enclosedText = token.slice(1, -1)
        s.l.root =
            enclosing === "/"
                ? new StringNode(token as RegexLiteralDefinition, context)
                : new LiteralNode(
                      token as StringLiteralDefinition,
                      enclosedText,
                      context
                  )
        return s
    }

    export type Parse<
        S extends ParserState,
        Enclosing extends StartChar,
        Unscanned extends string
    > = Scanner.ShiftUntil<Unscanned, Enclosing> extends Scanner.Shifted<
        infer Scanned,
        infer NextUnscanned
    >
        ? NextUnscanned extends ""
            ? ParserState.Error<UnterminatedMessage<S["R"], Enclosing>>
            : ParserState.From<{
                  L: Left.SetRoot<S["L"], `${Enclosing}${Scanned}${Enclosing}`>
                  R: Scanner.TailOf<NextUnscanned>
              }>
        : never

    const throwUnterminatedEnclosed: scanner.OnInputEndFn = (
        scanner,
        shifted
    ) => {
        throw new Error(unterminatedMessage(shifted, shifted[0] as StartChar))
    }
}
