import { Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { optional } from "../str/operator/optional.js"
import { Node, obj } from "./common.js"

export namespace Record {
    export type Definition = Record<string, unknown>

    export type Infer<
        Def,
        Ctx extends Node.InferenceContext,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends `${string}?` ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            [K in RequiredKey]: Root.Infer<Def[K], Ctx>
        } & {
            [K in OptionalKey]?: Root.Infer<Def[K], Ctx>
        }
    >
}

type RecordLike = Record<string, unknown>

export const isArgValueRecordLike = (
    args: Node.Allows.Args
): args is Node.Allows.Args<RecordLike> =>
    typeof args.value === "object" &&
    args.value !== null &&
    !Array.isArray(args.value)

export class RecordNode extends obj {
    get tree() {
        const result: Record<string, unknown> = {}
        for (const [prop, propNode] of this.entries) {
            result[prop] = propNode.tree
        }
        return result
    }

    allows(args: Node.Allows.Args) {
        if (!isArgValueRecordLike(args)) {
            this.unassignableError(args)
            return false
        }
        const propValidationResults = this.allowsProps(args)
        if (
            propValidationResults.unseenValueKeys.size &&
            !args.cfg.ignoreExtraneousKeys &&
            !args.ctx.modelCfg.ignoreExtraneousKeys
        ) {
            const keys = [...propValidationResults.unseenValueKeys]
            this.checkError(args, "ExtraneousKeys", {
                keys,
                message: `Keys ${keys
                    .map((k) => `'${k}'`)
                    .join(", ")} were unexpected.`
            })
            return false
        }
        return propValidationResults.allSeenKeysAllowed
    }

    // TODO: Should maybe not use set for perf?
    private allowsProps(args: Node.Allows.Args<Record<string, unknown>>) {
        const result = {
            unseenValueKeys: new Set(Object.keys(args.value)),
            allSeenKeysAllowed: true
        }
        for (const [propKey, propNode] of this.entries) {
            const propArgs = this.argsForProp(args, propKey)
            if (propKey in args.value) {
                const propIsAllowed = propNode.allows(propArgs)
                if (!propIsAllowed) {
                    result.allSeenKeysAllowed = false
                }
            } else if (!(propNode instanceof optional)) {
                propNode.checkError(propArgs, "MissingKey", {
                    message: `Missing required value of type ${propNode.toString()}.`,
                    key: propKey
                })
                result.allSeenKeysAllowed = false
            }
            result.unseenValueKeys.delete(propKey)
        }
        return result
    }

    private argsForProp(
        args: Node.Allows.Args<Record<string, unknown>>,
        propKey: string
    ): Node.Allows.Args {
        return {
            ...args,
            value: args.value[propKey],
            ctx: {
                ...args.ctx,
                path: [...args.ctx.path, propKey]
            }
        }
    }

    create(args: Node.Create.Args) {
        const result: Record<string, unknown> = {}
        for (const [propKey, propNode] of this.entries) {
            // Don't include optional keys by default in generated values
            if (propNode instanceof optional) {
                continue
            }
            result[propKey] = propNode.create({
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

export type extraneousKeysError = Node.Allows.ErrorData<
    "ExtraneousKeys",
    {
        keys: string[]
    }
>

export type missingKeyError = Node.Allows.ErrorData<
    "MissingKey",
    {
        key: string
    }
>
