import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NumberNode extends TerminalNode<"number"> {
    constructor() {
        super("number")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "number") {
            addTypeKeywordDiagnostic(state, "number", "Must be a number")
        }
    }

    generate() {
        return 0
    }
}
