import { Evaluate } from "@re-/tools"
import { Root } from "../../../../root.js"
import { Base } from "../../../base.js"
import { Allows } from "../../../traversal/allows.js"
import { Create } from "../../../traversal/create.js"
import { optional } from "../expression/unary/optional.js"
import { checkObjectRoot, obj } from "./common.js"

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
            [K in RequiredKey]: Root.Infer<Def[K], Ctx>
        } & {
            [K in OptionalKey]?: Root.Infer<Def[K], Ctx>
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

export class DictionaryNode extends obj<DictionaryLike> {
    get tree() {
        const result: Record<string, unknown> = {}
        for (const [prop, propNode] of this.entries) {
            result[prop] = propNode.tree
        }
        return result
    }

    check(args: Allows.Args) {
        if (!checkObjectRoot(args, "dictionary")) {
            return
        }
        const extraneousValueKeys = this.allowsProps(args)
        if (
            extraneousValueKeys.size &&
            (args.cfg.diagnostics?.ExtraneousKeys?.enable ||
                args.ctx.modelCfg.diagnostics?.ExtraneousKeys?.enable)
        ) {
            args.diagnostics.push(
                new ExtraneousKeysDiagnostic(args, [...extraneousValueKeys])
            )
        }
    }

    // TODO: Should maybe not use set for perf?
    private allowsProps(args: Allows.Args<DictionaryLike>) {
        const extraneousValueKeys = new Set(Object.keys(args.data))
        for (const [propKey, propNode] of this.entries) {
            const propArgs = this.argsForProp(args, propKey)
            if (propKey in args.data) {
                propNode.check(propArgs)
            } else if (!(propNode instanceof optional)) {
                args.diagnostics.push(
                    new MissingKeyDiagnostic(propArgs, propKey)
                )
            }
            extraneousValueKeys.delete(propKey)
        }
        return extraneousValueKeys
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

    create(args: Create.Args) {
        const result: DictionaryLike = {}
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

export class ExtraneousKeysDiagnostic extends Allows.Diagnostic<
    "ExtraneousKeys",
    { enable?: boolean }
> {
    public message: string

    constructor(args: Allows.Args, public keys: string[]) {
        super("ExtraneousKeys", args)
        this.message = `Keys ${keys.join(", ")} were unexpected.`
    }
}

export class MissingKeyDiagnostic extends Allows.Diagnostic<"MissingKey"> {
    public message: string

    constructor(args: Allows.Args, public key: string) {
        super("MissingKey", args)
        this.message = `${key} is required.`
    }
}
