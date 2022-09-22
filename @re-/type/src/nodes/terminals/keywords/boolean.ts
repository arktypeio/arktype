import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class BooleanNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "boolean") {
            args.diagnostics.add("keyword", "boolean", args, {
                reason: "Must be boolean"
            })
        }
    }

    generate(): boolean {
        return false
    }
}
