import { Base } from "../base/index.js"

export namespace Literal {
    export type Definition = number | bigint | boolean | undefined | null

    export const matches = (def: unknown): def is Definition =>
        def === null ||
        typeof def === "undefined" ||
        typeof def === "boolean" ||
        typeof def === "number" ||
        typeof def === "bigint"

    export type DefToString<Def extends Definition> = Def extends bigint
        ? `${Def}n`
        : `${Def}`

    export type References<Def extends Definition, Filter> = Base.FilterToTuple<
        DefToString<Def>,
        Filter
    >

    export class Node extends Base.Leaf<Definition> {
        allows(args: Base.Validation.Args) {
            if (args.value === this.def) {
                return true
            }
            this.addUnassignable(args)
            return false
        }

        generate() {
            return this.def
        }
    }
}
