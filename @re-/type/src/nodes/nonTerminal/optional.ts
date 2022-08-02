import { Base } from "../base/index.js"
import { Shift } from "../parser/shift.js"
import { ParserState } from "../parser/state.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace Optional {
    export type Parse<S extends ParserState.State> =
        S["R"]["unscanned"] extends []
            ? ParserState.From<{
                  L: ParserState.Modify<S["L"], "?">
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>
            : ParserState.Error<
                  S,
                  `Suffix '?' is only valid at the end of a definition.`
              >

    export type Node<Child = unknown> = [Child, "?"]
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
