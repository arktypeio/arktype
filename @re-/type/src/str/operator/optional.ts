import { Node, Parser, unary, Unary } from "./common.js"

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

export const finalizeOptional = (
    s: Parser.state.withRoot,
    ctx: Node.context
) => {
    if (s.r.lookahead !== undefined) {
        throw new Error(nonTerminatingOptionalMessage)
    }
    return new optional(s.l.root, ctx)
}

const nonTerminatingOptionalMessage = `Suffix '?' is only valid at the end of a definition.`
type NonTerminatingOptionalMessage = typeof nonTerminatingOptionalMessage

export type Optional<Child = unknown> = Unary<Child, "?">

export class optional extends unary {
    get tree() {
        return [this.child.tree, "?"]
    }

    allows(args: Node.Allows.Args) {
        if (args.value === undefined) {
            return true
        }
        return this.child.allows(args)
    }

    create() {
        return undefined
    }
}
