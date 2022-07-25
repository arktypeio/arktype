import { pathAdd } from "../base/utils.js"
import { Root } from "../root.js"
import { Base } from "./base.js"

export namespace TupleType {
    export type Definition = unknown[] | readonly unknown[]
}

const lengthError = (def: TupleType.Definition, value: TupleType.Definition) =>
    `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

export class TupleNode extends Base.NonTerminal<Base.Parsing.Node[]> {
    static matches(def: object): def is TupleType.Definition {
        return Array.isArray(def)
    }

    constructor(def: TupleType.Definition, ctx: Base.Parsing.Context) {
        const children = def.map((childDef, i) =>
            Root.parse(childDef, { ...ctx, path: pathAdd(ctx.path, i) })
        )
        super(children, ctx)
    }

    allows(args: Base.Validation.Args) {
        if (!Array.isArray(args.value)) {
            //this.addUnassignable(args)
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
        for (const [itemIndex, itemNode] of Object.entries(this.children)) {
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
        for (const [itemIndex, itemNode] of Object.entries(this.children)) {
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

    // override structureReferences(args: Base.References.Args) {
    //     const result: TreeOf<string[]>[] = []
    //     for (const [, itemNode] of this.entries) {
    //         result.push(itemNode.structureReferences(args))
    //     }
    //     return result
    // }
}
