import { hasJsType } from "@arktype/tools"
import type { Base } from "../../base/base.js"
import type { Traversal } from "../../base/traversal.js"
import { Terminal } from "../terminal.js"

abstract class TypeKeywordNode
    extends Terminal.Node
    implements Base.ProblemSource
{
    readonly kind = "keyword"

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

    defaultMessage(traversal: Base.Traversal) {
        return ""
    }
}

type InferPostcondition<node> = node extends {
    allowsData: (data: unknown) => data is infer T
}
    ? T
    : never

class AnyNode extends TypeKeywordNode {
    readonly definition = "any"
    readonly mustBe = "anything"
    allowsData(data: unknown): data is any {
        return true
    }
}

class BigintNode extends TypeKeywordNode {
    readonly definition = "bigint"
    readonly mustBe = "a bigint"
    allowsData(data: unknown): data is bigint {
        return typeof data === "bigint"
    }
}

class BooleanNode extends TypeKeywordNode {
    readonly definition = "boolean"
    readonly mustBe = "a boolean"
    allowsData(data: unknown): data is boolean {
        return typeof data === "boolean"
    }
}

class FalseNode extends TypeKeywordNode {
    readonly definition = "false"
    readonly mustBe = "false"
    allowsData(data: unknown): data is false {
        return data === false
    }
}

class NeverNode extends TypeKeywordNode {
    readonly definition = "never"
    readonly mustBe = "nothing"
    allowsData(data: unknown): data is never {
        return false
    }
}

class NullNode extends TypeKeywordNode {
    readonly definition = "null"
    readonly mustBe = "null"
    allowsData(data: unknown): data is null {
        return data === null
    }
}

class NumberNode extends TypeKeywordNode {
    readonly definition = "number"
    readonly mustBe = "a number"
    allowsData(data: unknown): data is number {
        return typeof data === "number"
    }
}

class ObjectNode extends TypeKeywordNode {
    readonly definition = "object"
    readonly mustBe = "an object"
    allowsData(data: unknown): data is object {
        return typeof data === "object" && data !== null
    }
}

class StringNode extends TypeKeywordNode {
    readonly definition = "string"
    readonly mustBe = "a string"
    allowsData(data: unknown): data is string {
        return typeof data === "string"
    }
}

class SymbolNode extends TypeKeywordNode {
    readonly definition = "symbol"
    readonly mustBe = "a symbol"
    allowsData(data: unknown): data is symbol {
        return typeof data === "symbol"
    }
}

class TrueNode extends TypeKeywordNode {
    readonly definition = "true"
    readonly mustBe = "true"
    allowsData(data: unknown): data is true {
        return data === true
    }
}

class UndefinedNode extends TypeKeywordNode {
    readonly definition = "undefined"
    readonly mustBe = "undefined"
    allowsData(data: unknown): data is undefined {
        return data === undefined
    }
}

class UnknownNode extends TypeKeywordNode {
    readonly definition = "unknown"
    readonly mustBe = "anything"
    allowsData(data: unknown): data is unknown {
        return true
    }
}

class VoidNode extends TypeKeywordNode {
    readonly definition = "void"
    readonly mustBe = "undefined"
    allowsData(data: unknown): data is void {
        return data === undefined
    }
}

// Keywords for builtin JS objects

class FunctionNode extends TypeKeywordNode {
    readonly definition = "Function"
    readonly mustBe = "a function"
    allowsData(data: unknown): data is Function {
        return typeof data === "function"
    }
}

// Supplemental type keywords

class ArrayNode extends TypeKeywordNode {
    readonly definition = "array"
    readonly mustBe = "an array"
    allowsData(data: unknown): data is unknown[] {
        return Array.isArray(data)
    }
}

class DictionaryNode extends TypeKeywordNode {
    readonly definition = "dictionary"
    readonly mustBe = "a non-array object"
    allowsData(data: unknown): data is Record<string, unknown> {
        return hasJsType(data, "object")
    }
}

export const typeKeywords = {
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
