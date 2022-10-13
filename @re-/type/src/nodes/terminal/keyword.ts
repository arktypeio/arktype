import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace Keyword {
    export type Definition = keyof Inferences

    export type Infer<D extends Definition> = Inferences[D]

    export const matches = (token: string): token is Definition =>
        token in nodes

    export const getNode = (def: Definition) => nodes[def]

    export class Node<Keyword extends Definition> extends Terminal.Node<
        "keyword",
        Keyword
    > {
        readonly kind = "keyword"

        constructor(
            public definition: Keyword,
            public mustBe: string,
            private accepts: (data: unknown) => boolean
        ) {
            super()
        }

        allows(state: Check.State) {
            return this.accepts(state.data)
        }
    }

    export type Inferences = {
        any: any
        bigint: bigint
        boolean: boolean
        never: never
        null: null
        number: number
        object: object
        string: string
        symbol: symbol
        undefined: undefined
        unknown: unknown
        void: void
        Function: Function
        email: string
        alphaonly: string
        alphanumeric: string
        lowercase: string
        uppercase: string
        integer: number
    }

    export const nodes = {
        any: new Node("any", "anything", () => true),
        bigint: new Node(
            "bigint",
            "a bigint",
            (data) => typeof data === "bigint"
        ),
        boolean: new Node(
            "boolean",
            "boolean",
            (data) => typeof data === "boolean"
        ),
        never: new Node("never", "nothing", () => false),
        null: new Node("null", "null", (data) => data === null),
        number: new Node(
            "number",
            "a number",
            (data) => typeof data === "number"
        ),
        object: new Node(
            "object",
            "an object or array",
            (data) => typeof data === "object" && data !== null
        ),
        string: new Node(
            "string",
            "a string",
            (data) => typeof data === "string"
        ),
        symbol: new Node(
            "symbol",
            "a symbol",
            (data) => typeof data === "symbol"
        ),
        undefined: new Node(
            "undefined",
            "undefined",
            (data) => data === undefined
        ),
        unknown: new Node("unknown", "anything", () => true),
        void: new Node("void", "undefined", (data) => data === undefined),
        Function: new Node(
            "Function",
            "a function",
            (data) => typeof data === "function"
        ),
        email: new Node("email", "a valid email", (data) =>
            /^(.+)@(.+)\.(.+)$/.test(data)
        ),
        alphaonly: new Node(
            "alphaonly",
            "a string including only letters",
            (data) => /^[A-Za-z]+$/.test(data)
        ),
        alphanumeric: new Node(
            "alphanumeric",
            "an alphanumeric string",
            (data) => /^[\dA-Za-z]+$/.test(data)
        ),
        lowercase: new Node(
            "lowercase",
            "a string of lowercase letters",
            (data) => /^[a-z]*$/.test(data)
        ),
        uppercase: new Node(
            "uppercase",
            "a string of uppercase letters",
            (data) => /^[A-Z]*$/.test(data)
        ),
        integer: new Node("integer", "an integer", (data) =>
            Number.isInteger(data)
        )
    }
}
