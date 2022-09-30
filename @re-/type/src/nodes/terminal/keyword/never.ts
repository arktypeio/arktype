import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NeverNode extends Terminal.Node<"never"> {
    constructor() {
        super("never")
    }

    check(state: Check.State) {
        addTypeKeywordDiagnostic(state, "never", "Never allowed")
    }
}
