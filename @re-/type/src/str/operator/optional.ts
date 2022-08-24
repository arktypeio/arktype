import { Node, Operator } from "./common.js"

export const reduce = (s: Operator.state, ctx: Node.context) => {
    if (s.r.lookahead !== undefined) {
        throw new Error(`Suffix '?' is only valid at the end of a definition.`)
    }
    s.l.root = new optional(s.l.root, ctx)
    return s
}

export type Optional<Child> = [Child, "?"]

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
