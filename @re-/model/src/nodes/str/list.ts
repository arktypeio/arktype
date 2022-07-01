import { Base } from "./base.js"
import { Bound } from "./bound.js"
import { Str } from "./str.js"

export namespace List {
    export type Definition<Child extends string = string> = `${Child}[]`

    export const matches = (def: string): def is Definition =>
        def.endsWith("[]")

    export class Node
        extends Base.Branch<Definition>
        implements Bound.Boundable
    {
        parse() {
            return [Str.parse(this.def.slice(0, -2), this.ctx)]
        }

        allows(args: Base.Validation.Args) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args)
                return false
            }
            const itemNode = this.children()[0]
            let allItemsAllowed = true
            let itemIndex = 0
            for (const itemValue of args.value) {
                const itemIsAllowed = itemNode.allows({
                    ...args,
                    value: itemValue,
                    ctx: {
                        ...args.ctx,
                        path: Base.pathAdd(args.ctx.path, itemIndex)
                    }
                })
                if (!itemIsAllowed) {
                    allItemsAllowed = false
                }
                itemIndex++
            }
            return allItemsAllowed
        }

        generate() {
            return []
        }

        boundBy = "items"

        toBound(value: unknown[]) {
            return value.length
        }
    }
}
