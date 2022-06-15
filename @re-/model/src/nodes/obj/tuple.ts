import { deepMerge, Entry } from "@re-/tools"
import { Root } from "../root.js"
import { Branch, Common } from "#common"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    const lengthError = (def: Definition, value: Definition) =>
        `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

    export const matches = (def: object): def is Definition =>
        Array.isArray(def)

    type ParseResult = Entry<number, Common.Node>[]

    export class Node extends Branch<Definition, ParseResult> {
        parse() {
            return this.def.map((elementDef, elementIndex) => [
                elementIndex,
                Root.parse(elementDef, {
                    ...this.ctx,
                    parsePath: Common.pathAdd(this.ctx.path, elementIndex)
                })
            ]) as ParseResult
        }

        allows(args: Common.AllowsArgs) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args)
                return
            }
            if (this.def.length !== args.value.length) {
                this.addCustomUnassignable(
                    args,
                    lengthError(this.def, args.value)
                )
                return
            }
            for (const [i, node] of this.next()) {
                node.allows({
                    ...args,
                    value: args.value[i],
                    ctx: deepMerge(args.ctx, {
                        valuePath: Common.pathAdd(args.ctx.valuePath, i)
                    })
                })
            }
        }

        generate(args: Common.GenerateArgs) {
            const result: unknown[] = []
            for (const [i, node] of this.next()) {
                result.push(
                    node.generate({
                        ...args,
                        ctx: deepMerge(args.ctx, {
                            valuePath: Common.pathAdd(args.ctx.valuePath, i)
                        })
                    })
                )
            }
            return result
        }
    }
}
