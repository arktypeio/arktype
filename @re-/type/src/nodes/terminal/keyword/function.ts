import type { Check } from "../../traverse/exports.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class FunctionNode extends Terminal.Node<"function"> {
    constructor() {
        super("function")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "function") {
            addTypeKeywordDiagnostic(state, "Function", "Must be a function")
        }
    }
}
