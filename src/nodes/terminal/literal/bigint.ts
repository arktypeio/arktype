import { PrimitiveLiteral } from "./literal.js"

export namespace BigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    export class Node extends PrimitiveLiteral.Node {
        public definition: Definition
        readonly kind = "bigintLiteral"

        constructor(public value: bigint) {
            super()
            this.definition = `${value}n`
        }
    }
}
