import { PrimitiveLiteralNode } from "../common.js"

export type NumberLiteralDefinition<Value extends number = number> = `${Value}`

/** Matches a well-formatted numeric expression */
const NUMBER_MATCHER = /^-?(0|[1-9]\d*)(\.\d+)?$/

export const literalToNumber = (def: NumberLiteralDefinition) => {
    const value = parseFloat(def)
    if (Number.isNaN(value)) {
        throw new Error(
            `Unexpectedly failed to parse a numeric value from '${value}'.`
        )
    }
    return value
}

export class numberLiteralNode extends PrimitiveLiteralNode<
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
