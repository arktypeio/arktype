import type { Dictionary, InstanceOf } from "@re-/tools"
import type { Base } from "../base.js"
import { Terminal } from "./terminal.js"

export namespace Keyword {
    export type Definition = keyof Inferences

    export type Infer<definition extends Definition> = Inferences[definition]

    export const matches = (token: string): token is Definition =>
        token in nodes

    type Nodes = typeof nodes

    type Instances = { [K in keyof Nodes]: InstanceOf<Nodes[K]> }

    type Inferences = {
        [K in keyof Instances]: Instances[K]["allows"] extends (
            data: unknown
        ) => data is infer T
            ? T
            : Parameters<Instances[K]["allows"]>[0]
    }

    export class StringNode extends Terminal.Node {
        kind = "keyword"
        definition = "string"
        mustBe = "a string"
        allows(data: unknown): data is string {
            return typeof data === "string"
        }
    }

    export class NumberNode extends Terminal.Node {
        kind = "keyword"
        definition = "number"
        mustBe = "a number"
        allows(data: unknown): data is number {
            return typeof data === "number"
        }
    }

    const cache = {
        string: new StringNode(),
        number: new NumberNode()
    } as {
        string: StringNode
        number: NumberNode
    } & Dictionary<Terminal.Node>

    export const getNode = <Keyword extends Definition>(keyword: Keyword) => {
        if (!(keyword in cache)) {
            cache[keyword] = new nodes[keyword]() as any
        }
        return cache[keyword] as Instances[Keyword]
    }

    export const isTopType = (
        node: Base.Node
    ): node is Instances["any" | "unknown"] =>
        node === getNode("any") || node === getNode("unknown")

    const nodes = {
        any: class extends Terminal.Node {
            kind = "keyword"
            definition = "any"
            mustBe = "anything"
            allows(data: unknown): data is any {
                return true
            }
        },
        bigint: class extends Terminal.Node {
            kind = "keyword"
            definition = "bigint"
            mustBe = "a bigint"
            allows(data: unknown): data is bigint {
                return typeof data === "bigint"
            }
        },
        boolean: class extends Terminal.Node {
            kind = "keyword"
            definition = "boolean"
            mustBe = "a boolean"
            allows(data: unknown): data is boolean {
                return typeof data === "boolean"
            }
        },
        never: class extends Terminal.Node {
            kind = "keyword"
            definition = "never"
            mustBe = "nothing"
            allows(data: unknown): data is never {
                return false
            }
        },
        null: class extends Terminal.Node {
            kind = "keyword"
            definition = "null"
            mustBe = "null"
            allows(data: unknown): data is null {
                return data === null
            }
        },
        number: NumberNode,
        object: class extends Terminal.Node {
            kind = "keyword"
            definition = "object"
            mustBe = "an object"
            allows(data: unknown): data is object {
                return typeof data === "object" && data !== null
            }
        },
        string: StringNode,
        symbol: class extends Terminal.Node {
            kind = "keyword"
            definition = "symbol"
            mustBe = "a symbol"
            allows(data: unknown): data is symbol {
                return typeof data === "symbol"
            }
        },
        undefined: class extends Terminal.Node {
            kind = "keyword"
            definition = "undefined"
            mustBe = "undefined"
            allows(data: unknown): data is undefined {
                return data === undefined
            }
        },
        unknown: class extends Terminal.Node {
            kind = "keyword"
            definition = "unknown"
            mustBe = "anything"
            allows(data: unknown): data is unknown {
                return true
            }
        },
        void: class extends Terminal.Node {
            kind = "keyword"
            definition = "void"
            mustBe = "undefined"
            allows(data: unknown): data is void {
                return data === undefined
            }
        },
        Function: class extends Terminal.Node {
            kind = "keyword"
            definition = "Function"
            mustBe = "a function"
            allows(data: unknown): data is Function {
                return typeof data === "function"
            }
        },
        email: class extends Terminal.Node {
            kind = "keyword"
            definition = "email"
            mustBe = "a valid email"
            expression = /^(.+)@(.+)\.(.+)$/
            allows(data: string) {
                return this.expression.test(data)
            }
            precondition = cache.string
        },
        alphaonly: class extends Terminal.Node {
            kind = "keyword"
            definition = "alphaonly"
            mustBe = "only letters"
            expression = /^[A-Za-z]+$/
            allows(data: string) {
                return this.expression.test(data)
            }
            precondition = cache.string
        },
        alphanumeric: class extends Terminal.Node {
            kind = "keyword"
            definition = "alphanumeric"
            mustBe = "only letters and digits"
            expression = /^[\dA-Za-z]+$/
            allows(data: string) {
                return this.expression.test(data)
            }
            precondition = cache.string
        },
        lowercase: class extends Terminal.Node {
            kind = "keyword"
            definition = "lowercase"
            mustBe = "only lowercase letters"
            expression = /^[a-z]*$/
            allows(data: string) {
                return this.expression.test(data)
            }
            precondition = cache.string
        },
        uppercase: class extends Terminal.Node {
            kind = "keyword"
            definition = "uppercase"
            mustBe = "only uppercase letters"
            expression = /^[A-Z]*$/
            allows(data: string) {
                return this.expression.test(data)
            }
            precondition = cache.string
        },
        integer: class extends Terminal.Node {
            kind = "keyword"
            definition = "integer"
            mustBe = "an integer"
            allows(data: number) {
                return Number.isInteger(data)
            }
            precondition = cache.number
        }
    }
}
