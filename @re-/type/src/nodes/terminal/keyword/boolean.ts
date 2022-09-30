import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BooleanNode extends Terminal.Node<"boolean"> {
    constructor() {
        super("boolean")
    }

    check(state: Check.State) {
        if (typeof state.data !== "boolean") {
            addTypeKeywordDiagnostic(state, "boolean", "Must be boolean")
        }
    }
}
