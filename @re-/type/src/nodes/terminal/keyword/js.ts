import { Terminal } from "../terminal.js"

class FunctionNode extends Terminal.Node {
    kind = "keyword"
    definition = "Function"
    mustBe = "a function"
    allows(data: unknown): data is Function {
        return typeof data === "function"
    }
}

export const jsKeywords = {
    Function: new FunctionNode()
}
