import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class SymbolNode extends Terminal.Node<"symbol"> {
    constructor() {
        super("symbol")
    }

    check(state: Check.State) {
        if (typeof state.data !== "symbol") {
            addTypeKeywordDiagnostic(state, "symbol", "Must be a symbol")
        }
    }
}
