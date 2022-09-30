import type { Check } from "../../traverse/exports.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NullNode extends Terminal.Node<"null"> {
    constructor() {
        super("null")
    }

    check(state: Check.CheckState) {
        if (state.data !== null) {
            addTypeKeywordDiagnostic(state, "null", "Must be null")
        }
    }
}
