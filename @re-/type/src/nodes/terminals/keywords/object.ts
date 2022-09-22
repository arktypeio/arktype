import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class ObjectNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "object" || args.data === null) {
            args.diagnostics.add("keyword", args, {
                definition: "object",
                data: args.data,
                reason: "Must be an object"
            })
        }
    }

    generate(): object {
        return {}
    }
}
