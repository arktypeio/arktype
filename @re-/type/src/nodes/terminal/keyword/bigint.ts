import type { Check } from "../../traverse/exports.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BigintNode extends Terminal.Node<"bigint"> {
    constructor() {
        super("bigint")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "bigint") {
            addTypeKeywordDiagnostic(state, "bigint", "Must be a bigint")
        }
    }
}
