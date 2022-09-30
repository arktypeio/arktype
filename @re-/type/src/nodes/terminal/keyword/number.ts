import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NumberNode extends Terminal.Node<"number"> {
    constructor() {
        super("number")
    }

    check(state: Check.State) {
        if (typeof state.data !== "number") {
            addTypeKeywordDiagnostic(state, "number", "Must be a number")
        }
    }
}
