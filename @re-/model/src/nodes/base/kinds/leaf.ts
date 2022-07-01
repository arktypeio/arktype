import { Node } from "./node.js"

export abstract class Leaf<DefType> extends Node<DefType> {
    references() {
        return [this.defToString()]
    }
}
