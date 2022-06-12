import { deepMerge, diffSets, Entry, Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { Optional } from "../str/index.js"
import { Branch, Common } from "#common"

export namespace Map {
    export type Definition = Record<string, unknown>

    export type Parse<
        Def,
        Dict,
        Seen,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends Optional.Definition ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            -readonly [K in RequiredKey]: Root.Parse<Def[K], Dict, Seen>
        } & {
            -readonly [K in OptionalKey]?: Root.Parse<Def[K], Dict, Seen>
        }
    >

    type ParseResult = Entry<string, Common.Node>[]

    export class Node extends Branch<Definition, ParseResult> {
        parse() {
            return Object.entries(this.def).map(([prop, propDef]) => [
                prop,
                Root.parse(propDef, {
                    ...this.ctx,
                    parsePath: Common.pathAdd(this.ctx.parsePath, prop)
                })
            ]) as ParseResult
        }

        allows(args: Common.AllowsArgs) {
            if (
                !args.value ||
                typeof args.value !== "object" ||
                Array.isArray(args.value)
            ) {
                this.addUnassignable(args)
                return
            }
            const keyErrors = this.checkKeyErrors(args)
            if (keyErrors) {
                this.addCustomUnassignable(keyErrors, args)
                return
            }
            for (const [prop, node] of this.next()) {
                node.allows({
                    ...args,
                    value: (args.value as any)[prop],
                    ctx: deepMerge(args.ctx, {
                        valuePath: Common.pathAdd(args.ctx.valuePath, prop)
                    })
                })
            }
        }

        generate(args: Common.GenerateArgs) {
            return Object.fromEntries(
                this.next().map(([prop, node]) => [prop, node.generate(args)])
            )
        }

        private checkKeyErrors = (args: Common.AllowsArgs) => {
            let message = ""
            const keyDiff = diffSets(
                Object.keys(this.def),
                Object.keys(args.value as any)
            )
            if (!keyDiff) {
                return message
            }
            if (keyDiff.removed) {
                // Ignore missing keys that are optional
                const missingRequiredKeys = keyDiff.removed.filter(
                    (k) =>
                        !(
                            typeof this.def[k] === "string" &&
                            Optional.matches(this.def[k] as string)
                        )
                )
                if (missingRequiredKeys.length) {
                    message += `Required keys '${missingRequiredKeys.join(
                        ", "
                    )}' were missing.`
                }
            }
            if (keyDiff.added && !args.options.ignoreExtraneousKeys) {
                // Add a leading space if we also had missing keys
                message += `${message ? " " : ""}Keys '${keyDiff.added.join(
                    ", "
                )}' were unexpected.`
            }
            return message
        }
    }
}
