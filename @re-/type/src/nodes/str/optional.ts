import { Base } from "./base.js"

export namespace OptionalType {}

export class OptionalNode extends Base.NonTerminal {
    allows(args: Base.Validation.Args) {
        if (args.value === undefined) {
            return true
        }
        return this.children.allows(args)
    }

    generate() {
        return undefined
    }
}
