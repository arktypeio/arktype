import { literalNode } from "./literal.js"

export type StringLiteralDefinition<Text extends string = string> =
    | `'${Text}'`
    | `"${Text}"`

export type StringLiteralQuote = `'` | `"`

export class StringLiteralNode extends literalNode<string> {
    toString() {
        return `"${this.value}"`
    }
}
