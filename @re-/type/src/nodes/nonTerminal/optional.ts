import { Base } from "../base/index.js"
import { Lexer } from "../parser/lexer.js"
import { State } from "../parser/state.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace Optional {
    export type Parse<S extends State.Type> =
        S["scanner"]["unscanned"] extends []
            ? State.ShiftOperator<S, [S["root"], "[]"]>
            : State.Error<
                  S,
                  `Suffix '?' is only valid at the end of a definition.`
              >

    export const parse = (s: State.Value, ctx: Base.Parsing.Context) => {
        if (s.scanner.next !== "END") {
            throw new Error(
                `Suffix '?' is only valid at the end of a definition.`
            )
        }
        s.root = new OptionalNode(s.root!, ctx)
        Lexer.shiftOperator(s.scanner)
    }

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
