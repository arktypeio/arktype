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

    constructor(public name: string, space: SpaceRoot) {
        const rootDef = space.definitions[name]
        const context = initializeParseContext(space.options, space)
        const root = Root.parse(rootDef, context)
        super(name, root.ast, context)
        this.root = root
        this.rootDef = rootDef
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
            if (state.checkedValuesByAlias[this.name]?.includes(state.data)) {
                // If we've already seen this value, it must not have any errors or else we wouldn't be here
                return true
            }
            if (!state.checkedValuesByAlias[this.name]) {
                state.checkedValuesByAlias[this.name] = [state.data]
            } else {
                state.checkedValuesByAlias[this.name].push(state.data)
            }
        }
        // TODO: Should maybe only check for type errors?
        const previousErrorCount = state.errors.length
        state.seen.push(this.name)
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
        if (state.seen.includes(this.name)) {
            const onRequiredCycle = state.options.generate?.onRequiredCycle
            if (onRequiredCycle) {
                return onRequiredCycle
            }
            throw new Generate.RequiredCycleError(this.name, state.seen)
        }
        state.seen.push(this.name)
        const result = this.root.generate(state)
        state.seen.pop()
        return result
    }
}
