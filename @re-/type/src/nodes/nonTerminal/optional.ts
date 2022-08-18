import { Base } from "../base/index.js"
import { State } from "../parser/index.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace Optional {
    export const reduce = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (s.r.lookahead !== undefined) {
            throw new Error(
                `Suffix '?' is only valid at the end of a definition.`
            )
        }
        s.l.root = new OptionalNode(s.l.root, ctx)
        return s
    }
}

export class OptionalNode extends NonTerminal {
    toString() {
        return this.children.toString() + "?"
    }

    allows(args: Base.Validation.Args) {
        if (args.value === undefined) {
            return true
        }
        return this.children.allows(args)
    }

    generate() {
        return undefined
    }
}
