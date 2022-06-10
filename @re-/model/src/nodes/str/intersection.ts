import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Branching, Common } from "#common"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const matches = (def: string): def is Definition => def.includes("&")

    const matcher = createSplittableMatcher("&")

    export class Node extends Branching<Definition> {
        *parse() {
            for (const member of this.def.match(matcher)!) {
                yield Str.parse(member, this.ctx)
            }
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            for (const branch of this.branches()) {
                branch.allows(value, errors)
                if (errors[this.ctx.path]) {
                    return
                }
            }
        }

        generate() {
            throw new Common.UngeneratableError(this.def, "intersection")
        }
    }
}
