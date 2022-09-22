import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class SymbolNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "symbol") {
            addTypeKeywordDiagnostic(args, "symbol", "Must be a symbol")
        }
    }

    generate(): symbol {
        return Symbol()
    }
}
