import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class NullNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== null) {
            args.diagnostics.add("keyword", "null", args, {
                reason: "Must be null"
            })
        }
    }

    generate(): null {
        return null
    }
}
