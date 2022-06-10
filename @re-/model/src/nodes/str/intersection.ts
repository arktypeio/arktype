import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Base } from "#base"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const matches = (def: string): def is Definition => def.includes("&")

    const matcher = createSplittableMatcher("&")

    export class Node extends Base.Branching<Definition> {
        *parse() {
            for (const member of this.def.match(matcher)!) {
                yield Str.parse(member, this.ctx)
            }
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            for (const branch of this.branches()) {
                branch.allows(value, errors)
                if (errors[this.ctx.path]) {
                    return
                }
            }
        }

        generate() {
            throw new Base.UngeneratableError(this.def, "intersection")
        }
    }
}
