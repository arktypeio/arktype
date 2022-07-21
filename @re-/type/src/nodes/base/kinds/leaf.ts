import { References } from "../features/references.js"
import { Node } from "./node.js"

export abstract class Leaf<DefType> extends Node<DefType> {
    collectReferences(args: References.Args, collected: References.Collection) {
        const reference = this.defToString()
        if (!args.filter || args.filter(reference)) {
            collected.add(reference)
        }
    }
}
