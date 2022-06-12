import { Common, Leaf } from "#common"

export namespace Regex {
    export type Definition = RegExp

    export const matches = (def: object): def is Definition =>
        def instanceof RegExp

    export class Node extends Leaf<Definition> {
        allows(args: Common.AllowsArgs) {
            if (typeof args.value !== "string") {
                this.addCustomUnassignable(
                    `Non-string value ${Common.stringifyValue(
                        args.value
                    )} cannot satisfy regex definitions.`,
                    args
                )
                return
            }
            if (!this.def.test(args.value)) {
                this.addCustomUnassignable(
                    `${Common.stringifyValue(
                        args.value
                    )} does not match expression /${this.def.source}/.`,
                    args
                )
                return
            }
        }

        generate() {
            throw new Common.UngeneratableError(`/${this.def.source}/`, "Regex")
        }
    }
}
