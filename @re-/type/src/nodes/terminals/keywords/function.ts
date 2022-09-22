import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class FunctionNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "function") {
            args.diagnostics.add("keyword", args, {
                definition: "function",
                data: args.data,
                reason: "Must be a function"
            })
        }
    }

    generate(): Function {
        return Function()
    }
}
