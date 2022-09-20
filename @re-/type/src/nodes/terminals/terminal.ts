import { Base } from "../base.js"
import type { References } from "../references.js"

export type TerminalConstructorArgs = [
    definition: string,
    context: Base.context
]

export abstract class terminalNode extends Base.node<string> {
    constructor(...[definition, context]: TerminalConstructorArgs) {
        super(definition, definition, context)
    }

    toString() {
        return this.definition
    }

    collectReferences(
        args: References.Options,
        collected: References.Collection
    ) {
        const reference = this.toString()
        if (!args.filter || args.filter(reference)) {
            collected[reference] = true
        }
    }
}
