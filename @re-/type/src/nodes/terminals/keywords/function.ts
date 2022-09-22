import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class FunctionNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "function") {
            addTypeKeywordDiagnostic(args, "function", "Must be a function")
        }
    }

    generate(): Function {
        return Function()
    }
}
