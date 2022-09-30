import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class VoidNode extends Terminal.Node<"void"> {
    constructor() {
        super("void")
    }

    check(state: Check.State) {
        if (state.data !== undefined) {
            addTypeKeywordDiagnostic(state, "void", "Must be undefined")
        }
    }
}
