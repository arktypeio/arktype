import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class ObjectNode extends Terminal.Node<"object"> {
    constructor() {
        super("object")
    }

    check(state: Check.State) {
        if (typeof state.data !== "object" || state.data === null) {
            addTypeKeywordDiagnostic(state, "object", "Must be an object")
        }
    }
}
