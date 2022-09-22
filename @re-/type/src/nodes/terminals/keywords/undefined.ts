import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class UndefinedNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== undefined) {
            args.diagnostics.add("keyword", "undefined", args, {
                reason: "Must be undefined"
            })
        }
    }

    generate(): undefined {
        return undefined
    }
}
