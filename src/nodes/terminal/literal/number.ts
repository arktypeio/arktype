import { PrimitiveLiteral } from "./literal.js"

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = `${Value}`

    export type IntegerDefinition<Value extends bigint = bigint> = `${Value}`

    export class Node extends PrimitiveLiteral.Node {
        public definition: Definition
        readonly kind = "numberLiteral"

        constructor(public value: number) {
            super()
            this.definition = `${value}`
        }
    }
}
