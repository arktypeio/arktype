import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = `${Value}`

    export class Node extends Terminal.Node<"numberLiteral", Definition> {
        readonly kind = "numberLiteral"

        constructor(public value: number) {
            super()
        }

        allows(state: Check.State) {
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

    export class Node extends Terminal.Node<"bigintLiteral", Definition> {
        readonly kind = "bigintLiteral"

        constructor(public value: bigint) {
            super()
        }

        allows(state: Check.State) {
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

    export class Node extends Terminal.Node<"stringLiteral", Definition> {
        readonly kind = "stringLiteral"

        constructor(public value: string, public quote: Quote) {
            super()
        }

        allows(state: Check.State) {
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

export namespace BooleanLiteral {
    export type Definition<Value extends boolean = boolean> = `${Value}`

    export class Node extends Terminal.Node<"booleanLiteral", Definition> {
        readonly kind = "booleanLiteral"

        constructor(public value: boolean) {
            super()
        }

        allows(state: Check.State) {
            return state.data === this.value
        }

        get mustBe() {
            return this.definition
        }

        get definition() {
            return this.value ? "true" : "false"
        }
    }
}
