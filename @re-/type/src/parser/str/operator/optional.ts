import { optional } from "../../../nodes/expressions/unaries/optional.js"
import type { parseContext } from "../../common.js"
import type { Left } from "../state/left.js"
import type { parserState, ParserState } from "../state/state.js"

export type ParseOptional<S extends ParserState> = S["R"] extends ""
    ? ParserState.From<{
          L: Left.SuffixFrom<{
              lowerBound: S["L"]["lowerBound"]
              root: [S["L"]["root"], "?"]
              nextSuffix: "END"
          }>
          R: ""
      }>
    : ParserState.Error<NonTerminatingOptionalMessage>

export const parseOptional = (s: parserState.suffix, context: parseContext) => {
    if (s.r.lookahead !== "END") {
        throw new Error(nonTerminatingOptionalMessage)
    }
    s.l.root = new optional(s.l.root, context)
    s.l.nextSuffix = "END"
    return s
}

export const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage
