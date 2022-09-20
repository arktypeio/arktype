import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class SymbolNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "symbol") {
            args.diagnostics.push(new KeywordDiagnostic("symbol", args))
        }
    }

    generate(): symbol {
        return Symbol()
    }
}
