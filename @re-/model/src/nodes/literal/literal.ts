import { Common, Terminal } from "#common"

export namespace Literal {
    export type Definition = number | bigint | boolean | undefined | null

    export const matches = (def: unknown): def is Definition =>
        def === null ||
        typeof def === "undefined" ||
        typeof def === "boolean" ||
        typeof def === "number" ||
        typeof def === "bigint"

    export class Node extends Terminal<Definition> {
        allows(value: unknown, errors: Common.ErrorsByPath) {
            if (value !== this.def) {
                this.addUnassignable(value, errors)
            }
        }

        generate() {
            return this.def
        }
    }
}
