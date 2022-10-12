import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node<string> {
        constructor(definition: string) {
            super(definition)
        }

        allows(state: Check.State) {
            const resolution = state.resolve(this.definition)
            const checkedValues = state.checkedDataByAlias[this.definition]
            if (!checkedValues) {
                state.checkedDataByAlias[this.definition] = [state.data]
            } else if (checkedValues.some((value) => value === state.data)) {
                return
            } else {
                state.checkedDataByAlias[this.definition].push(state.data)
            }
            const priorContexts = state.clearContexts()
            resolution.allows(state)
            state.restoreContexts(priorContexts)
        }

        get description() {
            return this.definition
        }
    }
}
