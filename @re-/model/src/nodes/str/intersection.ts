import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Branch, Common } from "#common"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const matches = (def: string): def is Definition => def.includes("&")

    const matcher = createSplittableMatcher("&")

    export class Node extends Branch<Definition, Common.Node[]> {
        parse() {
            return this.def
                .match(matcher)!
                .map((member) => Str.parse(member, this.ctx))
        }

        allows(args: Common.AllowsArgs) {
            for (const branch of this.next()) {
                branch.allows(args)
                if (args.errors[this.ctx.parsePath]) {
                    return
                }
            }
        }

        generate() {
            throw new Common.UngeneratableError(this.def, "intersection")
        }
    }
}
