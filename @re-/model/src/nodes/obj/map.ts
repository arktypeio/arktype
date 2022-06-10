import { diffSets, DiffSetsResult, Entry, Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { Optional } from "../str/index.js"
import { Branch, Common } from "#common"

export namespace Map {
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

    const mismatchedKeysError = (
        keyErrors: NonNullable<DiffSetsResult<string>>
    ) => {
        let message = ""
        if (keyErrors.removed) {
            message += `Required keys '${keyErrors.removed.join(
                ", "
            )}' were missing.`
        }
        if (keyErrors.added) {
            // Add a leading space if we also had missing keys
            message += `${message ? " " : ""}Keys '${keyErrors.added.join(
                ", "
            )}' were unexpected.`
        }
        return message
    }

    export class Node extends Branch<object, ParseResult> {
        parse() {
            return Object.entries(this.def).map(([prop, propDef]) => [
                prop,
                Root.parse(propDef, {
                    ...this.ctx,
                    path: this.appendToPath(prop),
                    shallowSeen: []
                })
            ]) as ParseResult
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                this.addUnassignable(value, errors)
                return
            }
            const keyDiff = diffSets(Object.keys(this.def), Object.keys(value))
            if (keyDiff) {
                this.addUnassignableMessage(
                    mismatchedKeysError(keyDiff),
                    errors
                )
                return
            }
            for (const [prop, node] of this.next()) {
                node.allows((value as any)[prop], errors)
            }
        }

        generate() {
            return Object.fromEntries(
                this.next().map(([prop, node]) => [prop, node.generate()])
            )
        }
    }
}
