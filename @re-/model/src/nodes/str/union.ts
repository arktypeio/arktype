import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Common, Linked } from "#common"

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const matches = (def: string): def is Definition => def.includes("|")

    const matcher = createSplittableMatcher("|")

    export class Node extends Linked<Definition, Common.Node[]> {
        parse() {
            return this.def
                .match(matcher)!
                .map((member) => Str.parse(member, this.ctx))
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            for (const branch of this.next()) {
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
            return this.next()[0].generate()
        }
    }
}
