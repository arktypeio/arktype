import { Base } from "../../nodes/base.js"
import { Allows } from "../../nodes/traversal/allows.js"
import { Left } from "../parser/left.js"
import { parserState, ParserState } from "../parser/state.js"
import { StrNode, Unary, unary } from "./common.js"

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

export const parseOptional = (s: parserState.suffix, ctx: Base.context) => {
    if (s.r.lookahead !== "END") {
        throw new Error(nonTerminatingOptionalMessage)
    }
    s.l.root = new optional(s.l.root, ctx)
    s.l.nextSuffix = "END"
    return s
}

export const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage
