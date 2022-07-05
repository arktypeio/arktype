import { References } from "../features/references.js"
import { Node } from "./node.js"

export abstract class Leaf<DefType> extends Node<DefType> {
    references(args: References.Args) {
        const reference = this.defToString()
        if (args.filter && !args.filter(reference)) {
            return []
        }
        return [reference]
    }
}
