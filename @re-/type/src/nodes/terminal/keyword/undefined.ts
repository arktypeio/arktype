import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class UndefinedNode extends Terminal.Node<"undefined"> {
    constructor() {
        super("undefined")
    }

    check(state: Check.State) {
        if (state.data !== undefined) {
            addTypeKeywordDiagnostic(state, "undefined", "Must be undefined")
        }
    }
}
