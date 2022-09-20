import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class FunctionNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "function") {
            args.diagnostics.push(new KeywordDiagnostic("function", args))
        }
    }

    generate(): Function {
        return Function()
    }
}
