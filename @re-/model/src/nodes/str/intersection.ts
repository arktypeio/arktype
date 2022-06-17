import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Common } from "#common"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const matches = (def: string): def is Definition => def.includes("&")

    const matcher = createSplittableMatcher("&")

    export class Node extends Common.Branch<Definition, Common.Parser.Node[]> {
        parse() {
            return this.def.match(matcher)!.map((member) => {
                if (member === "&&") {
                    throw new Common.Parser.UnknownTypeError("")
                }
                return Str.parse(member, this.ctx)
            })
        }

        allows(args: Common.Allows.Args) {
            for (const branch of this.next()) {
                branch.allows(args)
                if (args.errors.has(args.ctx.path)) {
                    return
                }
            }
        }

        generate() {
            throw new Common.Generate.UngeneratableError(
                this.def,
                "Intersection generation is unsupported."
            )
        }
    }
}
