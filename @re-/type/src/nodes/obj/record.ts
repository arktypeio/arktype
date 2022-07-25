import { Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { OptionalNode } from "../str/index.js"
import { Base, StructuredNonTerminal } from "./base.js"

export namespace RecordType {
    export type Definition = Record<string, unknown>

    export type Infer<
        Def,
        Ctx extends Base.Parsing.InferenceContext,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends `${string}?` ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            -readonly [K in RequiredKey]: Root.Infer<Def[K], Ctx>
        } & {
            -readonly [K in OptionalKey]?: Root.Infer<Def[K], Ctx>
        }
    >
}

export const valueIsRecordLike = (
    value: unknown
): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)

export class RecordNode extends StructuredNonTerminal {
    allows(args: Base.Validation.Args) {
        if (!valueIsRecordLike(args.value)) {
            this.addUnassignable(args)
            return false
        }
        const valueKeysLeftToCheck = new Set(Object.keys(args.value))
        let allPropsAllowed = true
        for (const [propKey, propNode] of this.entries) {
            const pathWithProp = Base.pathAdd(args.ctx.path, propKey)
            if (propKey in args.value) {
                const propIsAllowed = propNode.allows({
                    ...args,
                    value: args.value[propKey],
                    ctx: {
                        ...args.ctx,
                        path: pathWithProp
                    }
                })
                if (!propIsAllowed) {
                    allPropsAllowed = false
                }
            } else if (!(propNode instanceof OptionalNode)) {
                args.errors.add(
                    pathWithProp,
                    `Required value of type ${propNode.toString()} was missing.`
                )
                allPropsAllowed = false
            }
            valueKeysLeftToCheck.delete(propKey)
        }
        if (
            valueKeysLeftToCheck.size &&
            !args.cfg.ignoreExtraneousKeys &&
            !args.ctx.modelCfg.ignoreExtraneousKeys
        ) {
            args.errors.add(
                args.ctx.path,
                `Keys ${[...valueKeysLeftToCheck]
                    .map((k) => `'${k}'`)
                    .join(", ")} were unexpected.`
            )
            return false
        }
        return allPropsAllowed
    }

    generate(args: Base.Create.Args) {
        const result: Record<string, unknown> = {}
        for (const [propKey, propNode] of this.entries) {
            // Don't include optional keys by default in generated values
            if (propNode instanceof OptionalNode) {
                continue
            }
            result[propKey] = propNode.generate({
                ...args,
                ctx: {
                    ...args.ctx,
                    path: Base.pathAdd(args.ctx.path, propKey)
                }
            })
        }
        return result
    }
}
