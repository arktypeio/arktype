import type { Evaluate } from "@re-/tools"
import type { Allows } from "../allows.js"
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
        if (!checkObjectRoot(this.definition, "array", args)) {
            return
        }
        const expected = this.entries.length
        const actual = args.data.length
        if (expected !== actual) {
            args.diagnostics.add(
                "tupleLength",
                `Length must be ${expected}`,
                args,
                {
                    definition: this.definition,
                    data: args.data,
                    expected,
                    actual
                }
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
                context: {
                    ...args.context,
                    path: [...args.context.path, itemIndex]
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
                    context: {
                        ...args.context,
                        path: [...args.context.path, itemIndex]
                    }
                })
            )
        }
        return result
    }
}

export type TupleLengthDiagnostic = Allows.DefineDiagnostic<
    "tupleLength",
    {
        definition: TupleDefinition
        data: unknown[]
        expected: number
        actual: number
    }
>
