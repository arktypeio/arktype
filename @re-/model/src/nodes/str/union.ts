import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Base } from "#base"

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const matches = (def: string): def is Definition => def.includes("|")

    const matcher = createSplittableMatcher("|")

    export class Node extends Base.Branching<Definition> {
        *parse() {
            for (const member of this.def.match(matcher)!) {
                yield Str.parse(member, this.ctx)
            }
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            for (const branch of this.branches()) {
                const error = branch.validateByPath(value)[this.ctx.path]
                if (!error) {
                    return
                }
            }
            this.addUnassignableMessage(
                `${Base.stringifyValue(
                    value
                )} is not assignable to any of ${this.stringifyDef()}.`,
                errors
            )
        }

        generate() {
            return this.branch(0).generate()
        }
    }
}
