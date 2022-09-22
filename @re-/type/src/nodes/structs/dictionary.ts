import type { Dictionary, Evaluate } from "@re-/tools"
import type { Allows } from "../allows.js"
import type { Base } from "../base.js"
import { optional } from "../expressions/unaries/optional.js"
import type { Generate } from "../generate.js"
import type { RootInfer } from "../root.js"
import { checkObjectRoot, struct } from "./struct.js"

export type InferDictionary<
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

export class DictionaryNode extends struct<string> {
    check(args: Allows.Args) {
        if (!checkObjectRoot(this.definition, args)) {
            return
        }
        const checkExtraneous =
            args.cfg.diagnostics?.extraneousKeys?.enabled ||
            args.ctx.modelCfg.diagnostics?.extraneousKeys?.enabled
        const uncheckedData = checkExtraneous ? { ...args.data } : {}
        for (const [key, propNode] of this.entries) {
            const propArgs = this.argsForProp(args, key)
            if (key in args.data) {
                propNode.check(propArgs)
            } else if (!(propNode instanceof optional)) {
                args.diagnostics.add("missingKey", args, {
                    reason: `${key} is required`,
                    definition: propNode.definition,
                    key
                })
            }
            delete uncheckedData[key]
        }
        const extraneousKeys = Object.keys(uncheckedData)
        if (extraneousKeys.length) {
            args.diagnostics.add("extraneousKeys", args, {
                definition: this.definition,
                data: args.data,
                keys: extraneousKeys,
                reason: `Keys ${extraneousKeys.join(", ")} were unexpected`
            })
        }
    }

    private argsForProp(
        args: Allows.Args<Dictionary>,
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
        const result: Dictionary = {}
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

export type ExtraneousKeysDiagnostic = Allows.DefineDiagnostic<
    "extraneousKeys",
    {
        definition: Dictionary
        data: Dictionary
        keys: string[]
    },
    {
        enabled: boolean
    }
>

export type MissingKeyDiagnostic = Allows.DefineDiagnostic<
    "missingKey",
    {
        definition: Base.RootDefinition
        key: string
    }
>
