import { TerminalNode } from "../terminal.js"

export class AnyNode extends TerminalNode {
    // Allows all data
    typecheck() {}

    generate(): any {
        return undefined
    }
}
