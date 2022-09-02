import { Node, obj } from "./common.js"

export namespace TupleType {
    export type Definition = unknown[] | readonly unknown[]
}

export class TupleNode extends obj {
    static matches(def: object): def is TupleType.Definition {
        return Array.isArray(def)
    }

    get tree() {
        return this.entries.map(([, itemNode]) => itemNode.tree)
    }

    allows(args: Node.Allows.Args) {
        if (!Array.isArray(args.value)) {
            args.diagnostics.push(
                new Node.Allows.UnassignableDiagnostic(args, this)
            )
            return false
        }
        const expectedLength = this.entries.length
        const actualLength = args.value.length
        if (expectedLength !== actualLength) {
            args.diagnostics.push(
                new TupleLengthDiagnostic(
                    args,
                    this,
                    expectedLength,
                    actualLength
                )
            )
            return false
        }
        return this.allowsItems(args as Node.Allows.Args<unknown[]>)
    }

    private allowsItems(args: Node.Allows.Args<unknown[]>) {
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

export class TupleLengthDiagnostic extends Node.Allows
    .Diagnostic<"TupleLength"> {
    readonly code = "TupleLength"
    public message: string

    constructor(
        args: Node.Allows.Args,
        node: Node.base,
        public expectedLength: number,
        public actualLength: number
    ) {
        super(args, node)
        this.message = `Tuple of length ${actualLength} is not assignable to tuple of length ${expectedLength}.`
    }
}
