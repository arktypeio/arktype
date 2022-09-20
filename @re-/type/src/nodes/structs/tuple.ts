import type { Evaluate } from "@re-/tools"
import { Allows } from "../allows.js"
import type { Base } from "../base.js"
import type { Generate } from "../generate.js"
import type { RootInfer } from "../root.js"
import { checkObjectRoot, struct } from "./struct.js"

export type TupleDefinition = unknown[] | readonly unknown[]

export type InferTuple<
    Def extends readonly unknown[],
    Ctx extends Base.InferenceContext
> = Evaluate<{
    [I in keyof Def]: RootInfer<Def[I], Ctx>
}>

export class TupleNode extends struct<number> {
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

    generate(args: Generate.Args) {
        const result: unknown[] = []
        for (const [itemIndex, itemNode] of this.entries) {
            result.push(
                itemNode.generate({
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
