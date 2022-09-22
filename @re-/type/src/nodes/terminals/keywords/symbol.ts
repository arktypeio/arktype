import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class SymbolNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "symbol") {
            args.diagnostics.add("keyword", args, {
                definition: "symbol",
                data: args.data,
                reason: "Must be a symbol"
            })
        }
    }

    generate(): symbol {
        return Symbol()
    }
}
