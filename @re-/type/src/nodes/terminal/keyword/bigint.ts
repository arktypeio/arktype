import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BigintNode extends TerminalNode<"bigint"> {
    constructor() {
        super("bigint")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "bigint") {
            addTypeKeywordDiagnostic(state, "bigint", "Must be a bigint")
        }
    }

    generate(): bigint {
        return 0n
    }
}
