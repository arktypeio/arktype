import { literalNode } from "./literal.js"

export class numberLiteralNode extends literalNode<number> {
    toString() {
        return String(this.value)
    }
}
