import { Base } from "./base.js"
import { Bound } from "./bound.js"
import { Str } from "./str.js"

export namespace ListType {}

export class ListNode extends Base.NonTerminal implements Bound.Boundable {
    allows(args: Base.Validation.Args) {
        if (!Array.isArray(args.value)) {
            // this.addUnassignable(args)
            return false
        }
        let allItemsAllowed = true
        let itemIndex = 0
        for (const itemValue of args.value) {
            const itemIsAllowed = this.children.allows({
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
