import { literalNode } from "./literal.js"

export class StringLiteralNode extends literalNode<string> {
    toString() {
        return `"${this.value}"`
    }
}
