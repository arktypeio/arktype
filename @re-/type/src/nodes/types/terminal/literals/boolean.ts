import { literalNode } from "./literal.js"

export class booleanLiteralNode extends literalNode<boolean> {
    toString() {
        return this.value ? "true" : "false"
    }
}
