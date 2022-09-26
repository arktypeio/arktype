import type { Dictionary, Evaluate } from "@re-/tools"
import type { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { Check, Generate } from "../traverse/exports.js"
import { OptionalNode } from "../unaries/optional.js"
import { checkObjectRoot, struct } from "./struct.js"

export type InferDictionary<
    Ast,
    Space,
    OptionalKey extends keyof Ast = {
        [K in keyof Ast]: Ast[K] extends [unknown, "?"] ? K : never
    }[keyof Ast],
    RequiredKey extends keyof Ast = Exclude<keyof Ast, OptionalKey>
> = Evaluate<
    {
        [K in RequiredKey]: RootNode.Infer<Ast[K], Space>
    } & {
        [K in OptionalKey]?: RootNode.Infer<Ast[K], Space>
    }
>

export class DictionaryNode extends struct<string> {
    check(state: Check.CheckState) {
        if (!checkObjectRoot(this.definition, "dictionary", state)) {
            return
        }
        const extraneousKeys = this.checkChildrenAndGetIllegalKeys(state)
        if (extraneousKeys.length) {
            this.addExtraneousKeyDiagnostic(state, extraneousKeys)
        }
    }

    /** Returns any extraneous keys, if the options is enabled and they exist */
    private checkChildrenAndGetIllegalKeys(
        state: Check.CheckState<Dictionary>
    ): string[] {
        const rootData: any = state.data
        // const checkExtraneous =
        //     args.config.errors?.extraneousKeys?.enabled ||
        //     args.context.resolutionConfig.errors?.extraneousKeys?.enabled
        const uncheckedData: any = {} // checkExtraneous ? { ...args.data } : {}
        for (const [k, child] of this.entries) {
            if (k in rootData) {
                state.path.push(k)
                state.data = rootData[k]
                child.check(state)
                state.path.pop()
            } else if (!(child instanceof OptionalNode)) {
                this.addMissingKeyDiagnostic(state, k, child.definition)
            }
            delete uncheckedData[k]
        }
        state.data = rootData
        return Object.keys(uncheckedData)
    }

    generate(state: Generate.GenerateState) {
        const result: Dictionary = {}
        for (const [k, child] of this.entries) {
            // Don't include optional keys by default in generated values
            if (child instanceof OptionalNode) {
                continue
            }
            state.path.push(k)
            result[k] = child.generate(state)
            state.path.pop()
        }
        return result
    }

    private addMissingKeyDiagnostic(
        state: Check.CheckState<Dictionary>,
        key: string,
        definition: Base.RootDefinition
    ) {
        state.errors.add(
            "missingKey",
            { reason: `${key} is required`, state: state },
            {
                definition,
                key
            }
        )
    }

    private addExtraneousKeyDiagnostic(
        state: Check.CheckState<Dictionary>,
        keys: string[]
    ) {
        const reason =
            keys.length === 1
                ? `Key '${keys[0]}' was unexpected`
                : `Keys '${keys.join("', '")}' were unexpected`
        state.errors.add(
            "extraneousKeys",
            { reason, state: state },
            {
                definition: this.definition,
                data: state.data,
                keys
            }
        )
    }
}

export type ExtraneousKeysDiagnostic = Check.DiagnosticConfig<
    {
        definition: Dictionary
        data: Dictionary
        keys: string[]
    },
    {
        enabled: boolean
    }
>

export type MissingKeyDiagnostic = Check.DiagnosticConfig<{
    definition: Base.RootDefinition
    key: string
}>
