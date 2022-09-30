import type { Check } from "../../traverse/exports.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class UndefinedNode extends Terminal.Node<"undefined"> {
    constructor() {
        super("undefined")
    }

    check(state: Check.CheckState) {
        if (state.data !== undefined) {
            addTypeKeywordDiagnostic(state, "undefined", "Must be undefined")
        }
    }
}
