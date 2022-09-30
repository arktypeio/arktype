import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BigintNode extends Terminal.Node<"bigint"> {
    constructor() {
        super("bigint")
    }

    check(state: Check.State) {
        if (typeof state.data !== "bigint") {
            addTypeKeywordDiagnostic(state, "bigint", "Must be a bigint")
        }
    }
}
