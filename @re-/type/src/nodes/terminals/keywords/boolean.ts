import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class BooleanNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "boolean") {
            args.diagnostics.add("keyword", args, {
                definition: "boolean",
                data: args.data,
                reason: "Must be boolean"
            })
        }
    }

    generate(): boolean {
        return false
    }
}
