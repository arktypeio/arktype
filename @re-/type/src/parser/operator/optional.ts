import { Node, Parser, StrNode, Unary, unary } from "./common.js"

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

export const parseOptional = (s: Parser.state.suffix, ctx: Nodes.context) => {
    if (s.r.lookahead !== "END") {
        throw new Error(nonTerminatingOptionalMessage)
    }
    s.l.root = new optional(s.l.root, ctx)
    s.l.nextSuffix = "END"
    return s
}

export const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage

export type Optional<Child = unknown> = Unary<Child, "?">

export class optional extends unary {
    get tree(): Optional<StrNode> {
        return [this.child.tree, "?"]
    }

    allows(args: Nodes.Allows.Args) {
        if (args.data === undefined) {
            return true
        }
        return this.child.allows(args)
    }

    create() {
        return undefined
    }
}
