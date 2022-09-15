import { literalNode } from "./literal.js"

export class numberLiteralNode extends literalNode<number> {
    constructor(definition: NumberLiteralDefinition) {
        super(parseFloat(definition))
    }

    toString() {
        return String(this.value)
    }
}
