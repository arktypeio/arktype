import { References } from "../features/references.js"
import { Node } from "./base.js"

export abstract class Leaf<DefType> extends Node<DefType> {
    references(args: References.Options) {
        return [this.defToString()]
    }
}
