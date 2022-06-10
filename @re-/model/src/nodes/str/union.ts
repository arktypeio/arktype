import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Branching, Common } from "#common"

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const matches = (def: string): def is Definition => def.includes("|")

    const matcher = createSplittableMatcher("|")

    export class Node extends Branching<Definition> {
        *parse() {
            const members = this.def.match(matcher)!
            let i = 0
            // Yield parsed nodes until we hit the last group, then return its parse result
            while (i < members.length - 1) {
                yield Str.parse(members[i], this.ctx)
                i++
            }
            return Str.parse(members[i], this.ctx)
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            for (const branch of this.branches()) {
                const error = branch.validateByPath(value)[this.ctx.path]
                if (!error) {
                    return
                }
            }
            this.addUnassignableMessage(
                `${Common.stringifyValue(
                    value
                )} is not assignable to any of ${this.stringifyDef()}.`,
                errors
            )
        }

        generate() {
            return this.branches().next().value.generate()
        }
    }
}
