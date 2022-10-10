import type { Dictionary, MutuallyExclusiveProps } from "@re-/tools"
import { chainableNoOpProxy } from "@re-/tools"
import type { Base } from "../common.js"
import { Check } from "../traverse/check.js"
import type {
    Diagnostics,
    OptionsByDiagnostic
} from "../traverse/diagnostics.js"

export type Arktype<Inferred, Ast> = {
    infer: Inferred
    check: CheckFn<Inferred>
    assert: AssertFn<Inferred>
    ast: Ast
    definition: unknown
}

export type DynamicArktype = Arktype<unknown, unknown>

export type ArktypeOptions = {
    errors?: OptionsByDiagnostic
}

// TODO: Try this as base node.
export class ArktypeRoot implements DynamicArktype {
    constructor(
        private root: Base.Node,
        private context: ArktypeOptions,
        private resolutions: Dictionary<ArktypeRoot>
    ) {}

    check(data: unknown) {
        const state = new Check.State(data, this.context, this.resolutions)
        this.root.check(state)
        return state.errors.length
            ? {
                  errors: state.errors
              }
            : { data }
    }

    assert(data: unknown) {
        const result = this.check(data)
        result.errors?.throw()
        return result.data
    }

    get infer() {
        return chainableNoOpProxy
    }

    get ast() {
        return this.root.toAst()
    }

    get definition() {
        return this.root.toDefinition()
    }
}

export type CheckFn<Inferred> = (data: unknown) => CheckResult<Inferred>

export type CheckResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: Diagnostics
    }
>

export type AssertFn<Inferred> = (value: unknown) => Inferred
