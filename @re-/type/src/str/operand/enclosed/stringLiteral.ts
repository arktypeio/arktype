import { primitiveLiteralNode } from "../common.js"

export type StringLiteralDefinition<Text extends string = string> =
    | `'${Text}'`
    | `"${Text}"`

export type StringLiteralQuote = `'` | `"`

export class StringLiteralNode extends primitiveLiteralNode<string> {
    toString() {
        return `"${this.value}"`
    }
}
