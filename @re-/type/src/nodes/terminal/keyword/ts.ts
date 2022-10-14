import { Terminal } from "../terminal.js"

class AnyNode extends Terminal.Node {
    kind = "keyword"
    definition = "any"
    mustBe = "anything"
    allows(data: unknown): data is any {
        return true
    }
}

class BigintNode extends Terminal.Node {
    kind = "keyword"
    definition = "bigint"
    mustBe = "a bigint"
    allows(data: unknown): data is bigint {
        return typeof data === "bigint"
    }
}

class BooleanNode extends Terminal.Node {
    kind = "keyword"
    definition = "boolean"
    mustBe = "a boolean"
    allows(data: unknown): data is boolean {
        return typeof data === "boolean"
    }
}

class FalseNode extends Terminal.Node {
    kind = "keyword"
    definition = "false"
    mustBe = "false"
    allows(data: unknown): data is false {
        return data === false
    }
}

class NeverNode extends Terminal.Node {
    kind = "keyword"
    definition = "never"
    mustBe = "nothing"
    allows(data: unknown): data is never {
        return false
    }
}

class NullNode extends Terminal.Node {
    kind = "keyword"
    definition = "null"
    mustBe = "null"
    allows(data: unknown): data is null {
        return data === null
    }
}

class NumberNode extends Terminal.Node {
    kind = "keyword"
    definition = "number"
    mustBe = "a number"
    allows(data: unknown): data is number {
        return typeof data === "number"
    }
}

class ObjectNode extends Terminal.Node {
    kind = "keyword"
    definition = "object"
    mustBe = "an object"
    allows(data: unknown): data is object {
        return typeof data === "object" && data !== null
    }
}

class StringNode extends Terminal.Node {
    kind = "keyword"
    definition = "string"
    mustBe = "a string"
    allows(data: unknown): data is string {
        return typeof data === "string"
    }
}

class SymbolNode extends Terminal.Node {
    kind = "keyword"
    definition = "symbol"
    mustBe = "a symbol"
    allows(data: unknown): data is symbol {
        return typeof data === "symbol"
    }
}

class TrueNode extends Terminal.Node {
    kind = "keyword"
    definition = "true"
    mustBe = "true"
    allows(data: unknown): data is true {
        return data === true
    }
}

class UndefinedNode extends Terminal.Node {
    kind = "keyword"
    definition = "undefined"
    mustBe = "undefined"
    allows(data: unknown): data is undefined {
        return data === undefined
    }
}

class UnknownNode extends Terminal.Node {
    kind = "keyword"
    definition = "unknown"
    mustBe = "anything"
    allows(data: unknown): data is unknown {
        return true
    }
}

class VoidNode extends Terminal.Node {
    kind = "keyword"
    definition = "void"
    mustBe = "undefined"
    allows(data: unknown): data is void {
        return data === undefined
    }
}

export const tsKeywords = {
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
    void: new VoidNode()
}
