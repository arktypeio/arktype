import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class FunctionNode extends Terminal.Node<"Function"> {
    constructor() {
        super("Function")
    }

    check(state: Check.State) {
        if (typeof state.data !== "function") {
            addTypeKeywordDiagnostic(state, "Function", "Must be a function")
        }
    }
}
