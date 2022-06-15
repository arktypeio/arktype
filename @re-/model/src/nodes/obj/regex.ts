import { Common } from "#common"

export namespace Regex {
    export type Definition = RegExp

    export const matches = (def: object): def is Definition =>
        def instanceof RegExp

    export class Node extends Common.Leaf<Definition> {
        allows(args: Common.Allows.Args) {
            if (typeof args.value !== "string") {
                args.errors.add(
                    this.ctx.path,
                    `Non-string value ${Common.stringifyValue(
                        args.value
                    )} cannot satisfy regex definitions.`
                )
                return
            }
            if (!this.def.test(args.value)) {
                args.errors.add(
                    this.ctx.path,
                    `${Common.stringifyValue(
                        args.value
                    )} does not match expression /${this.def.source}/.`
                )
                return
            }
        }

        generate() {
            throw new Common.Generate.UngeneratableError(
                `/${this.def.source}/`,
                "Regex generation is unsupported."
            )
        }
    }
}
