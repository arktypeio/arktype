import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"

export class VoidNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== undefined) {
            args.diagnostics.add("keyword", args, {
                definition: "void",
                data: args.data,
                reason: "Must be undefined"
            })
        }
    }

    generate(): void {}
}
