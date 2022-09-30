import { Root } from "../parser/root.js"
import { Base } from "./base.js"
import type { Check } from "./traverse/check/check.js"
import { checkCustomValidator } from "./traverse/check/customValidator.js"

export class ResolutionNode extends Base.node {
    public root: Base.node
    public rootDef: unknown

    constructor(public name: string, public ctx: Base.context) {
        super()
        const rootDef = ctx.space!.aliases[name]
        const root = Root.parse(rootDef, ctx)
        this.root = root
        this.rootDef = rootDef
    }

    toString() {
        return this.name
    }

    toAst() {
        return this.name
    }

    toIsomorphicDef() {
        return this.name
    }

    check(state: Check.State) {
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
        this.root.check(state)
        if (
            state.options.narrow &&
            previousErrorCount === state.errors.length
        ) {
            checkCustomValidator(state.options.narrow, this, state)
        }
    }
}
