import { Str } from "../str.js"
import { Node, Operator, Parser, str } from "./common.js"

export type ParseOptional<S extends Parser.State> = S["R"] extends ""
    ? Parser.State.From<{
          L: Parser.Left.SuffixFrom<{
              lowerBound: S["L"]["lowerBound"]
              root: [S["L"]["root"], "?"]
              nextSuffix: "END"
          }>
          R: ""
      }>
    : Parser.State.Error<NonTerminatingOptionalMessage>

export const finalizeOptional = (s: Operator.state, ctx: Node.context) => {
    if (s.r.lookahead !== "END") {
        throw new Error(nonTerminatingOptionalMessage)
    }
    return new str(s.l.root, ctx, { optional: true })
}

const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage

export type Optional = [unknown, "?"]
