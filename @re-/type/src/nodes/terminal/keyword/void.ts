import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class VoidNode extends TerminalNode<"void"> {
    constructor() {
        super("void")
    }

    check(state: Check.CheckState) {
        if (state.data !== undefined) {
            addTypeKeywordDiagnostic(state, "void", "Must be undefined")
        }
    }

    generate(): void {}
}
