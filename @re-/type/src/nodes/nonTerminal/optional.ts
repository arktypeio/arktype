import { Base } from "../base/index.js"
import { ParserType } from "../parser.js"
import { Shift } from "../shift.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace Optional {
    export namespace T {
        export type Parse<S extends ParserType.State> =
            S["R"]["unscanned"] extends []
                ? ParserType.StateFrom<{
                      L: ParserType.Modifier<S["L"], "?">
                      R: Shift.Operator<S["R"]["unscanned"]>
                  }>
                : ParserType.ErrorState<
                      S,
                      `Suffix '?' is only valid at the end of a definition.`
                  >
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
