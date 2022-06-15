import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Allows, Branch, Generate, Parser } from "#common"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const matches = (def: string): def is Definition => def.includes("&")

    const matcher = createSplittableMatcher("&")

    export class Node extends Branch<Definition, Parser.Node[]> {
        parse() {
            return this.def
                .match(matcher)!
                .map((member) => Str.parse(member, this.ctx))
        }

        allows(args: Allows.Args) {
            for (const branch of this.next()) {
                branch.allows(args)
                if (args.errors.has(args.ctx.path)) {
                    return
                }
            }
        }

        generate() {
            throw new Generate.UngeneratableError(
                this.def,
                "Intersection generation is unsupported."
            )
        }
    }
}
