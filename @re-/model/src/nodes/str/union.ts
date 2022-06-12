import { createSplittableMatcher } from "./common.js"
import { Str } from "./str.js"
import { Branch, Common } from "#common"

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const matches = (def: string): def is Definition => def.includes("|")

    const matcher = createSplittableMatcher("|")

    export class Node extends Branch<Definition, Common.Node[]> {
        parse() {
            return this.def
                .match(matcher)!
                .map((member) => Str.parse(member, this.ctx))
        }

        allows(args: Common.AllowsArgs) {
            const branchDefinitionsToErrors: Record<string, string> = {}
            for (const branch of this.next()) {
                const branchErrorMessage = branch.validateByPath(
                    args.value,
                    args.options
                )[this.ctx.path]
                if (!branchErrorMessage) {
                    // If any branch of a Union does not have errors,
                    // we can return right away since the whole definition is valid
                    return
                }
                branchDefinitionsToErrors[branch.def as string] =
                    branchErrorMessage
            }
            let errorMessage = `${Common.stringifyValue(
                args.value
            )} is not assignable to any of ${this.stringifyDef()}.`
            if (args.options.verbose) {
                errorMessage += `\n${Common.stringifyErrors(
                    branchDefinitionsToErrors
                )}`
            }
            this.addUnassignableMessage(errorMessage, args.errors)
        }

        generate() {
            return this.next()[0].generate()
        }
    }
}
