import { Base } from "../../base/index.js"
import { StructuredNonTerminal } from "./structuredNonTerminal.js"

export namespace TupleType {
    export type Definition = unknown[] | readonly unknown[]
}

const lengthError = (def: TupleType.Definition, value: TupleType.Definition) =>
    `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

export class TupleNode extends StructuredNonTerminal {
    static matches(def: object): def is TupleType.Definition {
        return Array.isArray(def)
    }

    allows(args: Base.Validate.Args) {
        if (!Array.isArray(args.value)) {
            this.addUnassignable(args)
            return false
        }
        if (this.children.length !== args.value.length) {
            args.errors.add(
                args.ctx.path,
                lengthError(this.children, args.value)
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
                    path: Base.pathAdd(args.ctx.path, itemIndex)
                }
            })
            if (!itemIsAllowed) {
                allItemsAllowed = false
            }
        }
        return allItemsAllowed
    }

    generate(args: Base.Create.Args) {
        const result: unknown[] = []
        for (const [itemIndex, itemNode] of this.entries) {
            result.push(
                itemNode.generate({
                    ...args,
                    ctx: {
                        ...args.ctx,
                        path: Base.pathAdd(args.ctx.path, itemIndex)
                    }
                })
            )
        }
        return result
    }
}
