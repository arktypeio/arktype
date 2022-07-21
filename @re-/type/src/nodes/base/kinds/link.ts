import { Parsing } from "../features/parsing.js"
import { References } from "../features/references.js"
import { NonTerminal } from "./nonTerminal.js"

export abstract class Link<
    DefType,
    Child extends Parsing.Node = Parsing.Node
> extends NonTerminal<DefType, Child> {
    get child() {
        return this.next()
    }

    collectReferences(args: References.Args, collected: Set<string>) {
        this.child.collectReferences(args, collected)
    }

    abstract parse(): Child
}
