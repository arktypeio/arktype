import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class StringNode extends TerminalNode<"string"> {
    constructor() {
        super("string")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "string") {
            addTypeKeywordDiagnostic(state, "string", "Must be a string")
        }
    }

    generate() {
        return ""
    }
}
