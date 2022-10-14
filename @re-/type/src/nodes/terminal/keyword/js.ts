import { Terminal } from "../terminal.js"

class FunctionNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "Function"
    readonly mustBe = "a function"
    allows(data: unknown): data is Function {
        return typeof data === "function"
    }
}

export const jsKeywords = {
    Function: new FunctionNode()
}
