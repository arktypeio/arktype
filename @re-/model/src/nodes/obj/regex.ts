import { Base } from "./base.js"

export namespace Regex {
    export type Definition = RegExp

    export const matches = (def: object): def is Definition =>
        def instanceof RegExp

    export class Node extends Base.Leaf<Definition> {
        defToString() {
            return `/${this.def.source}/`
        }

        allows(args: Base.Validation.Args) {
            if (typeof args.value !== "string") {
                args.errors.add(
                    this.ctx.path,
                    `Non-string value ${Base.stringifyValue(
                        args.value
                    )} cannot satisfy regex definitions.`
                )
                return
            }
            if (!this.def.test(args.value)) {
                args.errors.add(
                    this.ctx.path,
                    `${Base.stringifyValue(
                        args.value
                    )} does not match expression ${this.defToString()}.`
                )
                return
            }
        }

        generate() {
            throw new Base.Generation.UngeneratableError(
                `/${this.def.source}/`,
                "Regex generation is unsupported."
            )
        }
    }
}
