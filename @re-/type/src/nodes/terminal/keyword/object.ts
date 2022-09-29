import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class ObjectNode extends TerminalNode<"object"> {
    constructor() {
        super("object")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "object" || state.data === null) {
            addTypeKeywordDiagnostic(state, "object", "Must be an object")
        }
    }

    generate(): object {
        return {}
    }
}
