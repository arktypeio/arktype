import type { Base } from "../base.js"
import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace Keyword {
    export type Definition = keyof Inferences

    export type Infer<D extends Definition> = Inferences[D]

    export const matches = (token: string): token is Definition =>
        token in nodes

    export const getNode = <Keyword extends Definition>(keyword: Keyword) =>
        nodes[keyword]

    // @ts-expect-error TS doesn't like some of our Pre/Post condition inference
    // TODO: Convert keywords back to invididual nodes
    export class Node<
        Keyword extends Definition,
        Precondition extends Base.Node
    > extends Terminal.Node {
        readonly kind = "keyword"

        constructor(
            public definition: Keyword,
            public mustBe: string,
            public allows: Base.AllowsFn<this>,
            public precondition?: Precondition
        ) {
            super()
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

    const stringNode = new Node(
        "string",
        "a string",
        (data): data is string => typeof data === "string"
    )

    const numberNode = new Node(
        "number",
        "a number",
        (data): data is number => typeof data === "number"
    )

    export const nodes = {
        any: new Node("any", "anything", () => true),
        bigint: new Node(
            "bigint",
            "a bigint",
            (data): data is bigint => typeof data === "bigint"
        ),
        boolean: new Node(
            "boolean",
            "boolean",
            (data): data is boolean => typeof data === "boolean"
        ),
        never: new Node("never", "nothing", () => false),
        null: new Node("null", "null", (data): data is null => data === null),
        number: numberNode,
        object: new Node(
            "object",
            "an object or array",
            (data): data is object => typeof data === "object" && data !== null
        ),
        string: stringNode,
        symbol: new Node(
            "symbol",
            "a symbol",
            (data): data is symbol => typeof data === "symbol"
        ),
        undefined: new Node(
            "undefined",
            "undefined",
            (data): data is undefined => data === undefined
        ),
        unknown: new Node("unknown", "anything", () => true),
        void: new Node(
            "void",
            "undefined",
            (data): data is void => data === undefined
        ),
        Function: new Node(
            "Function",
            "a function",
            (data): data is Function => typeof data === "function"
        ),
        email: new Node(
            "email",
            "a valid email",
            (data) => /^(.+)@(.+)\.(.+)$/.test(data),
            stringNode
        ),
        alphaonly: new Node(
            "alphaonly",
            "a string including only letters",
            (data) => /^[A-Za-z]+$/.test(data),
            stringNode
        ),
        alphanumeric: new Node(
            "alphanumeric",
            "an alphanumeric string",
            (data) => /^[\dA-Za-z]+$/.test(data),
            stringNode
        ),
        lowercase: new Node(
            "lowercase",
            "a string of lowercase letters",
            (data) => /^[a-z]*$/.test(data),
            stringNode
        ),
        uppercase: new Node(
            "uppercase",
            "a string of uppercase letters",
            (data) => /^[A-Z]*$/.test(data),
            stringNode
        ),
        integer: new Node(
            "integer",
            "an integer",
            (data) => Number.isInteger(data),
            numberNode
        )
    }
}
