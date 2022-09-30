import type { Check } from "../../traverse/exports.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NeverNode extends Terminal.Node<"never"> {
    constructor() {
        super("never")
    }

    check(state: Check.CheckState) {
        addTypeKeywordDiagnostic(state, "never", "Never allowed")
    }
}
