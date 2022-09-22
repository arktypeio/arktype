import type { Evaluate } from "@re-/tools"
import type { Allows } from "../allows.js"
import type { Base } from "../base.js"
import { optional } from "../expressions/unaries/optional.js"
import type { Generate } from "../generate.js"
import type { RootInfer } from "../root.js"
import { checkObjectRoot, struct } from "./struct.js"

export namespace Dictionary {
    export type Definition = Record<string, unknown>

    export type Infer<
        Def,
        Ctx extends Base.InferenceContext,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends `${string}?` ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            [K in RequiredKey]: RootInfer<Def[K], Ctx>
        } & {
            [K in OptionalKey]?: RootInfer<Def[K], Ctx>
        }
    >
}

type DictionaryLike = Record<string, unknown>

export const isArgValueRecordLike = (
    args: Allows.Args
): args is Allows.Args<DictionaryLike> =>
    typeof args.data === "object" &&
    args.data !== null &&
    !Array.isArray(args.data)

export class DictionaryNode extends struct<string> {
    check(args: Allows.Args) {
        if (!checkObjectRoot(this.definition, args)) {
            return
        }
        const uncheckedData = { ...args.data }
        for (const [key, propNode] of this.entries) {
            const propArgs = this.argsForProp(args, key)
            if (key in args.data) {
                propNode.check(propArgs)
            } else if (!(propNode instanceof optional)) {
                args.diagnostics.add("missingKey", propNode, args, {
                    reason: `${key} is required`,
                    key
                })
            }
            delete uncheckedData[key]
        }
        const extraneousKeys = Object.keys(uncheckedData)
        if (
            extraneousKeys.length &&
            (args.cfg.diagnostics?.extraneousKeys?.enabled ||
                args.ctx.modelCfg.diagnostics?.extraneousKeys?.enabled)
        ) {
            args.diagnostics.add("extraneousKeys", this.definition, args, {
                reason: `Keys ${extraneousKeys.join(", ")} were unexpected`,
                keys: extraneousKeys
            })
        }
    }

    private argsForProp(
        args: Allows.Args<DictionaryLike>,
        propKey: string
    ): Allows.Args {
        return {
            ...args,
            data: args.data[propKey],
            ctx: {
                ...args.ctx,
                path: [...args.ctx.path, propKey]
            }
        }
    }

    generate(args: Generate.Args) {
        const result: DictionaryLike = {}
        for (const [propKey, propNode] of this.entries) {
            // Don't include optional keys by default in generated values
            if (propNode instanceof optional) {
                continue
            }
            result[propKey] = propNode.generate({
                ...args,
                ctx: {
                    ...args.ctx,
                    path: [...args.ctx.path, propKey]
                }
            })
        }
        return result
    }
}
