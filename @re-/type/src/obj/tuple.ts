import { Node, obj } from "./common.js"

export namespace TupleType {
    export type Definition = unknown[] | readonly unknown[]
}

export type tupleLengthError = Node.Allows.ErrorData<
    "TupleLengthMismatch",
    {
        definitionLength: number
        valueLength: number
    }
>

export class TupleNode extends obj {
    static matches(def: object): def is TupleType.Definition {
        return Array.isArray(def)
    }

    get tree() {
        return this.entries.map(([, itemNode]) => itemNode.tree)
    }

    allows(args: Node.Allows.Args) {
        if (!Array.isArray(args.value)) {
            this.unassignableError(args)
            return false
        }
        const definitionLength = this.entries.length
        const valueLength = args.value.length
        if (definitionLength !== valueLength) {
            this.checkError(args, "TupleLengthMismatch", {
                message: `Tuple of length ${valueLength} is not assignable to tuple of length ${definitionLength}.`,
                definitionLength,
                valueLength
            })
            return false
        }
        let allItemsAllowed = true
        for (const [itemIndex, itemNode] of this.entries) {
            const itemIsAllowed = itemNode.allows({
                ...args,
                value: args.value[itemIndex as any],
                ctx: {
                    ...args.ctx,
                    path: [...args.ctx.path, itemIndex]
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
                        path: [...args.ctx.path, itemIndex]
                    }
                })
            )
        }
        return result
    }
}
