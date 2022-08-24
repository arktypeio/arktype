import { Node, Operator, Parser } from "./common.js"

export type FinalizeOptional<S extends Parser.State> = S["R"] extends ""
    ? Parser.State.From<{
          L: Parser.Left.SuffixFrom<{
              leftBound: S["L"]["leftBound"]
              root: [S["L"]["root"], "?"]
              nextSuffix: "END"
          }>
          R: ""
      }>
    : Parser.State.Error<NonTerminatingOptionalMessage>

export const finalizeOptional = (s: Operator.state, ctx: Node.context) => {
    if (s.r.lookahead !== undefined) {
        throw new Error(nonTerminatingOptionalMessage)
    }
    return new optional(s.l.root, ctx)
}

const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage

export type Optional<Child = unknown> = [Child, "?"]

export class optional extends Node.NonTerminal {
    toString() {
        return this.children.toString() + "?"
    }

    allows(args: Node.Allows.Args) {
        if (args.value === undefined) {
            return true
        }
        return this.children.allows(args)
    }

    create() {
        return undefined
    }
}
