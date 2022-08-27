import { Node, obj, Utils } from "./common.js"

export namespace TupleType {
    export type Definition = unknown[] | readonly unknown[]
}

const lengthError = (def: TupleType.Definition, value: TupleType.Definition) =>
    `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

export class TupleNode extends obj {
    static matches(def: object): def is TupleType.Definition {
        return Array.isArray(def)
    }

    get tree() {
        return { "[]": this.entries.map(([, itemNode]) => itemNode.tree) }
    }

    allows(args: Node.Allows.Args) {
        if (!Array.isArray(args.value)) {
            this.addUnassignable(args)
            return false
        }
        if (this.entries.length !== args.value.length) {
            args.errors.add(
                args.ctx.path,
                lengthError(this.entries, args.value)
            )
            return false
        }
        let allItemsAllowed = true
        for (const [itemIndex, itemNode] of this.entries) {
            const itemIsAllowed = itemNode.allows({
                ...args,
                value: args.value[itemIndex as any],
                ctx: {
                    ...args.ctx,
                    path: Utils.pathAdd(args.ctx.path, itemIndex)
                }
            })
            if (!itemIsAllowed) {
                allItemsAllowed = false
            }
        }
        return allItemsAllowed
    }

    create(args: Node.Create.Args) {
        const result: unknown[] = []
        for (const [itemIndex, itemNode] of this.entries) {
            result.push(
                itemNode.create({
                    ...args,
                    ctx: {
                        ...args.ctx,
                        path: Utils.pathAdd(args.ctx.path, itemIndex)
                    }
                })
            )
        }
        return result
    }
}
