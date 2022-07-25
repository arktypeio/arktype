import { Base } from "./base.js"

export namespace IntersectionType {}

export class IntersectionNode extends Base.NonTerminal<Base.Parsing.Node[]> {
    allows(args: Base.Validation.Args) {
        for (const branch of this.children) {
            if (!branch.allows(args)) {
                return false
            }
        }
        return true
    }

    generate() {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
