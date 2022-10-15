import { Evaluate, hasJsType } from "@arktype/tools"
import { Terminal } from "../terminal.js"

class ArrayNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "array"
    readonly mustBe = "an array"
    allows(data: unknown): data is unknown[] {
        return Array.isArray(data)
    }
}

class DictionaryNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "dictionary"
    readonly mustBe = "a non-array object"
    allows(data: unknown): data is Record<string, unknown> {
        return hasJsType(data, "object")
    }
}

export const typeKeywords = {
    array: new ArrayNode(),
    dictionary: new DictionaryNode()
}
