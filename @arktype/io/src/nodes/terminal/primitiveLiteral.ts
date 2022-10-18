import type { TraversalState } from "../traversal/traversal.js"
import { Terminal } from "./terminal.js"

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = `${Value}`

    export type IntegerDefinition<Value extends bigint = bigint> = `${Value}`

    export class Node extends Terminal.Node {
        readonly kind = "numberLiteral"

        constructor(public value: number) {
            super()
        }

        traverse(
            state: TraversalState
        ): state is TraversalState<this["value"]> {
            return state.data === this.value
        }

        get mustBe() {
            return `${this.definition}` as const
        }

        get definition() {
            return `${this.value}` as const
        }
    }
}

export namespace BigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    export class Node extends Terminal.Node {
        readonly kind = "bigintLiteral"

        constructor(public value: bigint) {
            super()
        }

        traverse(
            state: TraversalState
        ): state is TraversalState<this["value"]> {
            return state.data === this.value
        }

        get mustBe() {
            return this.definition
        }

        get definition() {
            return `${this.value}n` as const
        }
    }
}

export namespace StringLiteral {
    export type Definition<
        Text extends string = string,
        EnclosedBy extends Quote = Quote
    > = `${EnclosedBy}${Text}${EnclosedBy}`

    export type Quote = "'" | '"'

    export class Node extends Terminal.Node {
        readonly kind = "stringLiteral"

        constructor(public value: string, public quote: Quote) {
            super()
        }

        traverse(
            state: TraversalState
        ): state is TraversalState<this["value"]> {
            return state.data === this.value
        }

        get mustBe() {
            return this.definition
        }

        get definition() {
            return `${this.quote}${this.value}${this.quote}` as const
        }
    }
}
