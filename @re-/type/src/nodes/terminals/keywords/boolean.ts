import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BooleanNode extends TerminalNode {
    typecheck(state: Check.CheckState) {
        if (typeof state.data !== "boolean") {
            addTypeKeywordDiagnostic(state, "boolean", "Must be boolean")
        }
    }

    generate(): boolean {
        return false
    }
}
