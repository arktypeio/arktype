import { PrimitiveLiteralNode } from "../primitiveLiteral.js"

export type NumberLiteralDefinition<Value extends number = number> = `${Value}`

/** Matches a well-formatted numeric expression */
const NUMBER_MATCHER = /^-?(0|[1-9]\d*)(\.\d+)?$/

export class NumberLiteralNode extends PrimitiveLiteralNode<
    NumberLiteralDefinition,
    number
> {
    static matches(def: string): def is NumberLiteralDefinition {
        return NUMBER_MATCHER.test(def)
    }

    constructor(def: NumberLiteralDefinition) {
        const value = def.includes(".") ? parseFloat(def) : parseInt(def)
        super(def, value)
    }
}
