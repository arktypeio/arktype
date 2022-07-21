import { Parsing } from "../features/parsing.js"
import { References } from "../features/references.js"
import { NonTerminal } from "./nonTerminal.js"

export abstract class Branch<
    DefType,
    Children extends Parsing.Node[] = Parsing.Node[]
> extends NonTerminal<DefType, Children> {
    get children() {
        return this.next()
    }

    collectReferences(args: References.Args, collected: Set<string>) {
        for (const child of this.children) {
            child.collectReferences(args, collected)
        }
    }
}
