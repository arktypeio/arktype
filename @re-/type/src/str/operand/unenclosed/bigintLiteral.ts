import { primitiveLiteralNode } from "../common.js"

export type BigintLiteralDefinition<Value extends bigint = bigint> = `${Value}n`

/** Matches a well-formatted integer expression followed by "n" */
const BIGINT_MATCHER = /^-?(0|[1-9]\d*)n$/

export class bigintLiteralNode extends primitiveLiteralNode<
    BigintLiteralDefinition,
    bigint
> {
    static matches(def: string): def is BigintLiteralDefinition {
        return BIGINT_MATCHER.test(def)
    }

    constructor(def: BigintLiteralDefinition) {
        super(def, BigInt(def.slice(0, -1)))
    }
}
