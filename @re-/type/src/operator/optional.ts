import { Node } from "../common.js"
import { left, state } from "../parser/index.js"
// TODO: Fix which files get imported

export const reduce = (s: state<left.withRoot>, ctx: Node.Context) => {
    if (s.r.lookahead !== undefined) {
        throw new Error(`Suffix '?' is only valid at the end of a definition.`)
    }
    s.l.root = new node(s.l.root, ctx)
    return s
}

export type Node<Child> = [Child, "?"]

export class node extends Node.NonTerminal {
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
