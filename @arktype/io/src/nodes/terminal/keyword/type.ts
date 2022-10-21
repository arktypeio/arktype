import { hasJsType } from "@arktype/tools"
import type { Base } from "../../base/base.js"
import type { Traversal } from "../../base/traversal.js"
import { Terminal } from "../terminal.js"

export namespace TypeKeyword {
    abstract class Node extends Terminal.Node {
        abstract definition: Definition

        get kind() {
            return `${this.definition as this["definition"]}Keyword` as const
        }

        traverse(
            traversal: Base.Traversal
        ): traversal is Traversal<InferPostcondition<this>> {
            if (!this.allowsData(traversal.data)) {
                traversal.addProblem(this)
                return false
            }
            return true
        }

        abstract allowsData(data: unknown): data is unknown
    }

    type InferPostcondition<node> = node extends {
        allowsData: (data: unknown) => data is infer T
    }
        ? T
        : never

    class AnyNode extends Node {
        readonly definition = "any"
        readonly description = "anything"
        allowsData(data: unknown): data is any {
            return true
        }
    }

    class BigintNode extends Node {
        readonly definition = "bigint"
        readonly description = "a bigint"
        allowsData(data: unknown): data is bigint {
            return typeof data === "bigint"
        }
    }

    class BooleanNode extends Node {
        readonly definition = "boolean"
        readonly description = "a boolean"
        allowsData(data: unknown): data is boolean {
            return typeof data === "boolean"
        }
    }

    class FalseNode extends Node {
        readonly definition = "false"
        readonly description = "false"
        allowsData(data: unknown): data is false {
            return data === false
        }
    }

    class NeverNode extends Node {
        readonly definition = "never"
        readonly description = "nothing"
        allowsData(data: unknown): data is never {
            return false
        }
    }

    class NullNode extends Node {
        readonly definition = "null"
        readonly description = "null"
        allowsData(data: unknown): data is null {
            return data === null
        }
    }

    class NumberNode extends Node {
        readonly definition = "number"
        readonly description = "a number"
        allowsData(data: unknown): data is number {
            return typeof data === "number"
        }
    }

    class ObjectNode extends Node {
        readonly definition = "object"
        readonly description = "an object"
        allowsData(data: unknown): data is object {
            return typeof data === "object" && data !== null
        }
    }

    class StringNode extends Node {
        readonly definition = "string"
        readonly description = "a string"
        allowsData(data: unknown): data is string {
            return typeof data === "string"
        }
    }

    class SymbolNode extends Node {
        readonly definition = "symbol"
        readonly description = "a symbol"
        allowsData(data: unknown): data is symbol {
            return typeof data === "symbol"
        }
    }

    class TrueNode extends Node {
        readonly definition = "true"
        readonly description = "true"
        allowsData(data: unknown): data is true {
            return data === true
        }
    }

    class UndefinedNode extends Node {
        readonly definition = "undefined"
        readonly description = "undefined"
        allowsData(data: unknown): data is undefined {
            return data === undefined
        }
    }

    class UnknownNode extends Node {
        readonly definition = "unknown"
        readonly description = "anything"
        allowsData(data: unknown): data is unknown {
            return true
        }
    }

    class VoidNode extends Node {
        readonly definition = "void"
        readonly description = "undefined"
        allowsData(data: unknown): data is void {
            return data === undefined
        }
    }

    // Keywords for builtin JS objects

    class FunctionNode extends Node {
        readonly definition = "Function"
        readonly description = "a function"
        allowsData(data: unknown): data is Function {
            return typeof data === "function"
        }
    }

    // Supplemental type keywords

    class ArrayNode extends Node {
        readonly definition = "array"
        readonly description = "an array"
        allowsData(data: unknown): data is unknown[] {
            return Array.isArray(data)
        }
    }

    class DictionaryNode extends Node {
        readonly definition = "dictionary"
        readonly description = "a non-array object"
        allowsData(data: unknown): data is Record<string, unknown> {
            return hasJsType(data, "object")
        }
    }

    export const nodes = {
        any: new AnyNode(),
        bigint: new BigintNode(),
        boolean: new BooleanNode(),
        false: new FalseNode(),
        never: new NeverNode(),
        null: new NullNode(),
        number: new NumberNode(),
        object: new ObjectNode(),
        string: new StringNode(),
        symbol: new SymbolNode(),
        true: new TrueNode(),
        undefined: new UndefinedNode(),
        unknown: new UnknownNode(),
        void: new VoidNode(),
        array: new ArrayNode(),
        dictionary: new DictionaryNode(),
        Function: new FunctionNode()
    }

    export type Nodes = typeof nodes

    export type Definition = keyof Nodes
}
