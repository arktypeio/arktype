import { Terminal } from "../terminal.js"

class AnyNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "any"
    readonly mustBe = "anything"
    allows(data: unknown): data is any {
        return true
    }
}

class BigintNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "bigint"
    readonly mustBe = "a bigint"
    allows(data: unknown): data is bigint {
        return typeof data === "bigint"
    }
}

class BooleanNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "boolean"
    readonly mustBe = "a boolean"
    allows(data: unknown): data is boolean {
        return typeof data === "boolean"
    }
}

class FalseNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "false"
    readonly mustBe = "false"
    allows(data: unknown): data is false {
        return data === false
    }
}

class NeverNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "never"
    readonly mustBe = "nothing"
    allows(data: unknown): data is never {
        return false
    }
}

class NullNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "null"
    readonly mustBe = "null"
    allows(data: unknown): data is null {
        return data === null
    }
}

class NumberNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "number"
    readonly mustBe = "a number"
    allows(data: unknown): data is number {
        return typeof data === "number"
    }
}

class ObjectNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "object"
    readonly mustBe = "an object"
    allows(data: unknown): data is object {
        return typeof data === "object" && data !== null
    }
}

class StringNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "string"
    readonly mustBe = "a string"
    allows(data: unknown): data is string {
        return typeof data === "string"
    }
}

class SymbolNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "symbol"
    readonly mustBe = "a symbol"
    allows(data: unknown): data is symbol {
        return typeof data === "symbol"
    }
}

class TrueNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "true"
    readonly mustBe = "true"
    allows(data: unknown): data is true {
        return data === true
    }
}

class UndefinedNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "undefined"
    readonly mustBe = "undefined"
    allows(data: unknown): data is undefined {
        return data === undefined
    }
}

class UnknownNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "unknown"
    readonly mustBe = "anything"
    allows(data: unknown): data is unknown {
        return true
    }
}

class VoidNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "void"
    readonly mustBe = "undefined"
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
