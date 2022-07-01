import { Root } from "../root.js"
import { Base } from "./base.js"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    const lengthError = (def: Definition, value: Definition) =>
        `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

    export const matches = (def: object): def is Definition =>
        Array.isArray(def)

    export class Node extends Base.Branch<Definition> {
        parse() {
            return this.def.map((elementDef, elementIndex) =>
                Root.parse(elementDef, {
                    ...this.ctx,
                    path: Base.pathAdd(this.ctx.path, elementIndex)
                })
            )
        }

        allows(args: Base.Validation.Args) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args)
                return false
            }
            if (this.def.length !== args.value.length) {
                args.errors.add(
                    args.ctx.path,
                    lengthError(this.def, args.value)
                )
                return false
            }
            let allItemsAllowed = true
            for (const itemNode of this.children()) {
                const itemIndex = itemNode.keyOf()
                const itemIsAllowed = itemNode.allows({
                    ...args,
                    value: args.value[itemIndex as `${number}`],
                    ctx: {
                        ...args.ctx,
                        path: Base.pathAdd(args.ctx.path, itemIndex)
                    }
                })
                if (!itemIsAllowed) {
                    allItemsAllowed = false
                }
            }
            return allItemsAllowed
        }

        generate(args: Base.Generation.Args) {
            const result: unknown[] = []
            for (const itemNode of this.children()) {
                result.push(
                    itemNode.generate({
                        ...args,
                        ctx: {
                            ...args.ctx,
                            path: Base.pathAdd(args.ctx.path, itemNode.keyOf())
                        }
                    })
                )
            }
            return result
        }
    }
}
