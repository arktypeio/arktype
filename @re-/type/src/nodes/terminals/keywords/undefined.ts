import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class UndefinedNode extends TerminalNode {
    typecheck(state: Check.CheckState) {
        if (state.data !== undefined) {
            addTypeKeywordDiagnostic(state, "undefined", "Must be undefined")
        }
    }

    generate(): undefined {
        return undefined
    }
}
