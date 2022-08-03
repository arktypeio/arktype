import { PrimitiveLiteralNode } from "../primitiveLiteral.js"

export type StringLiteralDefinition<Text extends string = string> =
    | `'${Text}'`
    | `"${Text}"`

export type StringLiteralQuote = `'` | `"`

export class StringLiteralNode extends PrimitiveLiteralNode<string> {
    constructor(def: string) {
        super(def, def.slice(1, -1))
    }
}
