import { Base } from "#base"

export namespace Literal {
    export type Definition = number | bigint | boolean | undefined | null

    export const matches = (def: unknown): def is Definition =>
        def === null ||
        typeof def === "undefined" ||
        typeof def === "boolean" ||
        typeof def === "number" ||
        typeof def === "bigint"

    export class Node extends Base.Node<Definition> {
        validate(value: unknown, errors: Base.ErrorsByPath) {
            if (value !== this.def) {
                this.addUnassignable(value, errors)
            }
        }

        generate() {
            return this.def
        }
    }
}
