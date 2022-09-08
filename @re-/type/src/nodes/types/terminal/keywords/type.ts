import { Allows } from "../../../traversal/allows.js"
import { terminalNode } from "../terminal.js"

export abstract class typeNode extends terminalNode {
    check(args: Allows.Args) {
        if (this.allowsValue(args.data)) {
            return true
        }
        args.diagnostics.push(
            new Allows.UnassignableDiagnostic(this.toString(), args)
        )
        return false
    }

    abstract allowsValue(data: unknown): boolean
}
