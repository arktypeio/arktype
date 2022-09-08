import { Node, obj } from "./common.js"

export type TupleDefinition = unknown[] | readonly unknown[]

export class TupleNode extends obj<TupleDefinition> {
    static matches(def: object): def is TupleDefinition {
        return Array.isArray(def)
    }

    get tree() {
        return this.entries.map(([, itemNode]) => itemNode.tree)
    }

    allows(args: Nodes.Allows.Args) {
        if (!Array.isArray(args.data)) {
            args.diagnostics.push(
                new Nodes.Allows.UnassignableDiagnostic(this.toString(), args)
            )
            return false
        }
        const expectedLength = this.entries.length
        const actualLength = args.data.length
        if (expectedLength !== actualLength) {
            args.diagnostics.push(
                new TupleLengthDiagnostic(args, expectedLength, actualLength)
            )
            return false
        }
        return this.allowsItems(args as Nodes.Allows.Args<unknown[]>)
    }

    private allowsItems(args: Nodes.Allows.Args<unknown[]>) {
        let allItemsAllowed = true
        for (const [itemIndex, itemNode] of this.entries) {
            const itemIsAllowed = itemNode.allows({
                ...args,
                data: args.data[itemIndex as any],
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

    create(args: Nodes.Create.Args) {
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

export class TupleLengthDiagnostic extends Nodes.Allows
    .Diagnostic<"TupleLength"> {
    public message: string

    constructor(
        args: Nodes.Allows.Args,
        public expectedLength: number,
        public actualLength: number
    ) {
        super("TupleLength", args)
        this.message = `Tuple must have length ${expectedLength} (got ${actualLength}).`
    }
}
