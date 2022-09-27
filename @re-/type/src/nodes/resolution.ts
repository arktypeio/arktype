import type { KeySet } from "@re-/tools"
import type { parserContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import { Base } from "./base.js"
import { checkCustomValidator } from "./traverse/check/customValidator.js"
import { Generate } from "./traverse/exports.js"
import type { Check, References } from "./traverse/exports.js"

export class ResolutionNode extends Base.node {
    public root: Base.node
    public rootDef: unknown

    constructor(public name: string, ctx: parserContext) {
        const rootDef = ctx.space!.aliases[name]
        const root = Root.parse(rootDef, ctx)
        super(name, root.ast, ctx)
        this.root = root
        this.rootDef = rootDef
    }

    typeStr() {
        return this.root.typeStr()
    }

    collectReferences(opts: References.ReferencesOptions, collected: KeySet) {
        this.root.collectReferences(opts, collected)
    }

    references(opts: References.ReferencesOptions) {
        return this.root.references(opts)
    }

    typecheck(state: Check.CheckState) {
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
