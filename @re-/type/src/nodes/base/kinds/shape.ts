import { Parsing } from "../features/parsing.js"
import { References } from "../features/references.js"
import { NonTerminal } from "./nonTerminal.js"

type KeyOf<DefType> = DefType extends unknown[] | readonly unknown[]
    ? number
    : keyof DefType

export type ChildEntry<DefType> = [KeyOf<DefType>, Parsing.Node]

export abstract class Shape<
    DefType,
    Entry extends ChildEntry<DefType> = ChildEntry<DefType>
> extends NonTerminal<DefType, Entry[]> {
    get entries() {
        return this.next()
    }

    collectReferences(args: References.Args, collected: References.Collection) {
        for (const [, child] of this.entries) {
            child.collectReferences(args, collected)
        }
    }
}
