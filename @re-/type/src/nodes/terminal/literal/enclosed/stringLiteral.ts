import { PrimitiveLiteralNode } from "../primitiveLiteral.js"

export type StringLiteralDefinition<Text extends string = string> =
    | `'${Text}'`
    | `"${Text}"`

export type StringLiteralQuote = `'` | `"`

export class StringLiteralNode extends PrimitiveLiteralNode<
    StringLiteralDefinition,
    string
> {
    constructor(def: StringLiteralDefinition) {
        super(def, def.slice(1, -1))
    }
}
