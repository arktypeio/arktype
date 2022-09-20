import { keySet } from "@re-/tools"
import { StringNode } from "../../../nodes/terminals/keywords/string.js"
import { LiteralNode } from "../../../nodes/terminals/literal.js"
import type { Left } from "../state/left.js"
import type { scanner } from "../state/scanner.js"
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
    `${fragment} requires a closing ${enclosing}.`

type UnterminatedEnclosedMessage<
    Fragment extends string,
    Enclosing extends EnclosedBaseStartChar
> = `${Fragment} requires a closing ${Enclosing}.`

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
    enclosing: EnclosedBaseStartChar
) => {
    const definition = s.r.shiftUntil(untilLookaheadIsClosing[enclosing], {
        appendTo: enclosing,
        inclusive: true,
        onInputEnd: throwUnterminatedEnclosed
    })
    const enclosedText = definition.slice(1, -1)
    s.l.root =
        enclosing === "/"
            ? new StringNode(definition)
            : new LiteralNode(enclosedText)
    return s
}

export type ParseEnclosedBase<
    S extends ParserState,
    Enclosing extends EnclosedBaseStartChar
> = S["R"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
    ? ParserState.From<{
          L: Left.SetRoot<
              S["L"],
              Enclosing extends "/"
                  ? `${Enclosing}${Contents}${Enclosing}`
                  : `"${Contents}"`
          >
          R: Rest
      }>
    : ParserState.Error<UnterminatedEnclosedMessage<S["R"], Enclosing>>

const throwUnterminatedEnclosed: scanner.OnInputEndFn = (scanner, shifted) => {
    throw new Error(
        unterminatedEnclosedMessage(
            shifted,
            shifted[0] as EnclosedBaseStartChar
        )
    )
}
