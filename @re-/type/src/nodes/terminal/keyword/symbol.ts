import type { Check } from "../../traverse/exports.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class SymbolNode extends Terminal.Node<"symbol"> {
    constructor() {
        super("symbol")
    }

    check(state: Check.CheckState) {
        if (typeof state.data !== "symbol") {
            addTypeKeywordDiagnostic(state, "symbol", "Must be a symbol")
        }
    }
}
