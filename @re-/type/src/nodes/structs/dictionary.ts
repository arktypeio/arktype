import type { Dictionary, Evaluate } from "@re-/tools"
import type { Base } from "../base.js"
import type { RootNode } from "../common.js"
import { optional } from "../expressions/unaries/optional.js"
import type { Check, Generate } from "../traverse/exports.js"
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
        [K in RequiredKey]: RootNode.Infer<Def[K], Ctx>
    } & {
        [K in OptionalKey]?: RootNode.Infer<Def[K], Ctx>
    }
>

export class DictionaryNode extends struct<string> {
    check(args: Check.CheckArgs) {
        if (!checkObjectRoot(this.definition, "dictionary", args)) {
            return
        }
        const extraneousKeys = this.checkPropsAndGetIllegalKeys(args)
        if (extraneousKeys.length) {
            const reason =
                extraneousKeys.length === 1
                    ? `Key '${extraneousKeys[0]}' was unexpected`
                    : `Keys '${extraneousKeys.join("', '")}' were unexpected`
            args.diagnostics.add(
                "extraneousKeys",
                { reason, args },
                {
                    definition: this.definition,
                    data: args.data,
                    keys: extraneousKeys
                }
            )
        }
    }

    /** Returns any extraneous keys, if the options is enabled and they exist */
    private checkPropsAndGetIllegalKeys(
        args: Check.CheckArgs<Dictionary>
    ): string[] {
        const checkExtraneous =
            args.cfg.diagnostics?.extraneousKeys?.enabled ||
            args.context.modelCfg.diagnostics?.extraneousKeys?.enabled
        const uncheckedData = checkExtraneous ? { ...args.data } : {}
        for (const [key, propNode] of this.entries) {
            const propArgs = this.argsForProp(args, key)
            if (key in args.data) {
                propNode.check(propArgs)
            } else if (!(propNode instanceof optional)) {
                args.diagnostics.add(
                    "missingKey",
                    { reason: `${key} is required`, args },
                    {
                        definition: propNode.definition,
                        key
                    }
                )
            }
            delete uncheckedData[key]
        }
        return Object.keys(uncheckedData)
    }

    private argsForProp(
        args: Check.CheckArgs<Dictionary>,
        propKey: string
    ): Check.CheckArgs {
        return {
            ...args,
            data: args.data[propKey],
            context: {
                ...args.context,
                path: [...args.context.path, propKey]
            }
        }
    }

    generate(args: Generate.GenerateArgs) {
        const result: Dictionary = {}
        for (const [propKey, propNode] of this.entries) {
            // Don't include optional keys by default in generated values
            if (propNode instanceof optional) {
                continue
            }
            result[propKey] = propNode.generate({
                ...args,
                context: {
                    ...args.context,
                    path: [...args.context.path, propKey]
                }
            })
        }
        return result
    }
}

export type ExtraneousKeysDiagnostic = Check.DefineDiagnostic<
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

export type MissingKeyDiagnostic = Check.DefineDiagnostic<
    "missingKey",
    {
        definition: Base.RootDefinition
        key: string
    }
>
