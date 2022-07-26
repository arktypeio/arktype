import { PrimitiveLiteralNode } from "../primitiveLiteral.js"

export type StringLiteralDefinition<Text extends string = string> =
    | `'${Text}'`
    | `"${Text}"`

export type StringLiteralQuote = `'` | `"`

export class StringLiteralNode extends PrimitiveLiteralNode<string> {
    constructor(text: string, enclosedBy: StringLiteralQuote) {
        super(enclosedBy + text + enclosedBy, text)
    }
}
