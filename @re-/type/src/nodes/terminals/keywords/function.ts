import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class FunctionNode extends TerminalNode<"function"> {
    constructor() {
        super("function")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "function") {
            addTypeKeywordDiagnostic(state, "function", "Must be a function")
        }
    }

    generate(): Function {
        return Function()
    }
}
