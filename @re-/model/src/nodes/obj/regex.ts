import { Common, Leaf } from "#common"

export namespace Regex {
    export type Definition = RegExp

    export const matches = (def: object): def is Definition =>
        def instanceof RegExp

    export class Node extends Leaf<Definition> {
        allows(args: Common.AllowsArgs) {
            if (typeof args.value !== "string") {
                this.addCustomUnassignable(
                    args,
                    `Non-string value ${Common.stringifyValue(
                        args.value
                    )} cannot satisfy regex definitions.`
                )
                return
            }
            if (!this.def.test(args.value)) {
                this.addCustomUnassignable(
                    args,
                    `${Common.stringifyValue(
                        args.value
                    )} does not match expression /${this.def.source}/.`
                )
                return
            }
        }

        generate() {
            throw new Common.UngeneratableError(
                `/${this.def.source}/`,
                "Regex generation is unsupported."
            )
        }
    }
}
