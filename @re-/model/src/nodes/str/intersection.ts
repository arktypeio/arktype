import { Base, createSplittableMatcher } from "./base.js"
import { Str } from "./str.js"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const matches = (def: string): def is Definition => def.includes("&")

    const matcher = createSplittableMatcher("&")

    export const getMembers = (def: Definition) => def.match(matcher)!

    export class Node extends Base.Branch<Definition> {
        parse() {
            return getMembers(this.def).map((member) => {
                if (member === "&&") {
                    throw new Base.Parsing.UnknownTypeError("")
                }
                return Str.parse(member, this.ctx)
            })
        }

        allows(args: Base.Validation.Args) {
            for (const branch of this.children()) {
                if (!branch.allows(args)) {
                    return false
                }
            }
            return true
        }

        generate() {
            throw new Base.Generation.UngeneratableError(
                this.def,
                "Intersection generation is unsupported."
            )
        }
    }
}
