import { TerminalNode } from "../terminal.js"

export class AnyNode extends TerminalNode<"any"> {
    constructor() {
        super("any")
    }

    // Allows all data
    check() {}

    generate(): any {
        return undefined
    }
}
