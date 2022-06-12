import { Common, Leaf } from "#common"

export namespace Literal {
    export type Definition = number | bigint | boolean | undefined | null

    export const matches = (def: unknown): def is Definition =>
        def === null ||
        typeof def === "undefined" ||
        typeof def === "boolean" ||
        typeof def === "number" ||
        typeof def === "bigint"

    export class Node extends Leaf<Definition> {
        allows(args: Common.AllowsArgs) {
            if (args.value !== this.def) {
                this.addUnassignable(args.value, args.errors)
            }
        }

        generate() {
            return this.def
        }
    }
}
