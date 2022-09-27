import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NullNode extends TerminalNode {
    typecheck(state: Check.CheckState) {
        if (state.data !== null) {
            addTypeKeywordDiagnostic(state, "null", "Must be null")
        }
    }

    generate(): null {
        return null
    }
}
