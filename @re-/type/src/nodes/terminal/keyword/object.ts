import type { Check } from "../../traverse/exports.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class ObjectNode extends Terminal.Node<"object"> {
    constructor() {
        super("object")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "object" || state.data === null) {
            addTypeKeywordDiagnostic(state, "object", "Must be an object")
        }
    }
}
