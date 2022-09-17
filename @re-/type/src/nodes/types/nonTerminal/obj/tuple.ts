import { Allows } from "../../../traversal/allows.js"
import { Create } from "../../../traversal/create.js"
import { checkObjectRoot, obj } from "./common.js"

export type TupleDefinition = unknown[] | readonly unknown[]

export class TupleNode extends obj<TupleDefinition> {
    static matches(def: object): def is TupleDefinition {
        return Array.isArray(def)
    }

    get tree() {
        return this.entries.map(([, itemNode]) => itemNode.tree)
    }

    check(args: Allows.Args) {
        if (!checkObjectRoot(args, "array")) {
            return
        }
        const expectedLength = this.entries.length
        const actualLength = args.data.length
        if (expectedLength !== actualLength) {
            args.diagnostics.push(
                new TupleLengthDiagnostic(args, expectedLength, actualLength)
            )
            return
        }
        this.allowsItems(args)
    }

    private allowsItems(args: Allows.Args<unknown[]>) {
        for (const [itemIndex, itemNode] of this.entries) {
            itemNode.check({
                ...args,
                data: args.data[itemIndex as any],
                ctx: {
                    ...args.ctx,
                    path: [...args.ctx.path, itemIndex]
                }
            })
        }
    }

    create(args: Create.Args) {
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

export class TupleLengthDiagnostic extends Allows.Diagnostic<"TupleLength"> {
    public message: string

    constructor(
        args: Allows.Args,
        public expectedLength: number,
        public actualLength: number
    ) {
        super("TupleLength", args)
        this.message = `Must have length ${expectedLength} (got ${actualLength}).`
    }
}
