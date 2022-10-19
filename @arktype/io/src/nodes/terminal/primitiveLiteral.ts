import type { Base } from "../base/base.js"
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
            traversal: Base.Traversal
        ): traversal is Base.Traversal<this["value"]> {
            return traversal.data === this.value
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
            traversal: Base.Traversal
        ): traversal is Base.Traversal<this["value"]> {
            return traversal.data === this.value
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
            traversal: Base.Traversal
        ): traversal is Base.Traversal<this["value"]> {
            return traversal.data === this.value
        }

        get mustBe() {
            return this.definition
        }

        get definition() {
            return `${this.quote}${this.value}${this.quote}` as const
        }
    }
}
