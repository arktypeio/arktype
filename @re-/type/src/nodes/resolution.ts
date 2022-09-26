import { deepMerge } from "@re-/tools"
import { initializeParseContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import type { SpaceRoot } from "../space/root.js"
import { Base } from "./base.js"
import { checkCustomValidator } from "./traverse/check/customValidator.js"
import { Generate } from "./traverse/exports.js"
import type { Check, References } from "./traverse/exports.js"

export class ResolutionNode extends Base.node {
    public root: Base.node
    public rootDef: unknown

    constructor(public alias: string, space: SpaceRoot) {
        // If this is the first time we've seen the alias,
        // create a Node that will be used for future resolutions.
        const defAndOptions = getResolutionDefAndOptions(
            space.definitions[alias]
        )
        const context = initializeParseContext(
            defAndOptions.options
                ? deepMerge(space.options, defAndOptions.options)
                : space.options,
            space
        )
        const root = Root.parse(defAndOptions.def, context)
        super(alias, root.ast, context)
        this.root = root
        this.rootDef = defAndOptions.def
    }

    toString() {
        return this.root.toString()
    }

    collectReferences(
        opts: References.ReferencesOptions<string, boolean>,
        collected: References.ReferenceCollection
    ) {
        this.root.collectReferences(opts, collected)
    }

    references(opts: References.ReferencesOptions<string, boolean>) {
        return this.root.references(opts)
    }

    check(state: Check.CheckState) {
        // const nextArgs = this.nextArgs(state, this.context.validate)
        if (typeof state.data === "object" && state.data !== null) {
            if (state.checkedValuesByAlias[this.alias]?.includes(state.data)) {
                // If we've already seen this value, it must not have any errors or else we wouldn't be here
                return true
            }
            if (!state.checkedValuesByAlias[this.alias]) {
                state.checkedValuesByAlias[this.alias] = [state.data]
            } else {
                state.checkedValuesByAlias[this.alias].push(state.data)
            }
        }
        // TODO: Should maybe only check for type errors?
        const previousErrorCount = state.errors.length
        state.seen.push(this.alias)
        this.root.check(state)
        if (
            state.options.narrow &&
            previousErrorCount === state.errors.length
        ) {
            checkCustomValidator(state.options.narrow, this, state)
        }
        state.seen.pop()
    }

    generate(state: Generate.GenerateState) {
        if (state.seen.includes(this.alias)) {
            const onRequiredCycle = state.options.generate?.onRequiredCycle
            if (onRequiredCycle) {
                return onRequiredCycle
            }
            throw new Generate.RequiredCycleError(this.alias, state.seen)
        }
        state.seen.push(this.alias)
        const result = this.root.generate(state)
        state.seen.pop()
        return result
    }
}
