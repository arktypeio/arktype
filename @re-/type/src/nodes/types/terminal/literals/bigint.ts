import { literalNode } from "./literal.js"

export class bigintLiteralNode extends literalNode<bigint> {
    toString() {
        return `${this.value}n`
    }
}
