import { TerminalNode } from "../terminal.js"

export class AnyNode extends TerminalNode {
    // Allows all data
    check() {}

    generate(): any {
        return undefined
    }
}
