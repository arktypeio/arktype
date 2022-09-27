import { keySet } from "@re-/tools"
import type { Base } from "../../../nodes/base.js"
import type { RegexLiteralDefinition } from "../../../nodes/terminals/keywords/string.js"
import { StringNode } from "../../../nodes/terminals/keywords/string.js"
import type { StringLiteralDefinition } from "../../../nodes/terminals/literal.js"
import { LiteralNode } from "../../../nodes/terminals/literal.js"
import type { Left } from "../state/left.js"
import type { Scanner, scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"

export const enclosedBaseStartChars = keySet({
    "'": 1,
    '"': 1,
    "/": 1
})

export type EnclosedBaseStartChar = keyof typeof enclosedBaseStartChars

export type StringLiteralQuote = `'` | `"`

export const unterminatedEnclosedMessage = <
    Fragment extends string,
    Enclosing extends EnclosedBaseStartChar
>(
    fragment: Fragment,
    enclosing: Enclosing
): UnterminatedEnclosedMessage<Fragment, Enclosing> =>
    `${fragment} requires a closing ${enclosing}`

type UnterminatedEnclosedMessage<
    Fragment extends string,
    Enclosing extends EnclosedBaseStartChar
> = `${Fragment} requires a closing ${Enclosing}`

const untilLookaheadIsClosing: Record<
    EnclosedBaseStartChar,
    scanner.UntilCondition
> = {
    "'": (scanner) => scanner.lookahead === `'`,
    '"': (scanner) => scanner.lookahead === `"`,
    "/": (scanner) => scanner.lookahead === `/`
}

export const parseEnclosedBase = (
    s: parserState,
    enclosing: EnclosedBaseStartChar,
    context: Base.context
) => {
    const definition = s.r.shiftUntil(untilLookaheadIsClosing[enclosing], {
        appendTo: enclosing,
        inclusive: true,
        onInputEnd: throwUnterminatedEnclosed
    })
    const enclosedText = definition.slice(1, -1)
    s.l.root =
        enclosing === "/"
            ? new StringNode(definition as RegexLiteralDefinition, context)
            : new LiteralNode(
                  definition as StringLiteralDefinition,
                  enclosedText,
                  context
              )
    return s
}

export type ParseEnclosedBase<
    S extends ParserState,
    Enclosing extends EnclosedBaseStartChar,
    Unscanned extends string
> = Scanner.ShiftUntil<Unscanned, Enclosing> extends Scanner.Shifted<
    infer Scanned,
    infer NextUnscanned
>
    ? NextUnscanned extends ""
        ? ParserState.Error<UnterminatedEnclosedMessage<S["R"], Enclosing>>
        : ParserState.From<{
              L: Left.SetRoot<S["L"], `${Enclosing}${Scanned}${Enclosing}`>
              R: Scanner.TailOf<NextUnscanned>
          }>
    : never

const throwUnterminatedEnclosed: scanner.OnInputEndFn = (scanner, shifted) => {
    throw new Error(
        unterminatedEnclosedMessage(
            shifted,
            shifted[0] as EnclosedBaseStartChar
        )
    )
}
