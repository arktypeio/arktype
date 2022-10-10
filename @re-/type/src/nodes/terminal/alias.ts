import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node<string> {
        constructor(def: string) {
            super(def)
        }

        allows(state: Check.State) {
            const resolution = state.resolve(this.def)
            const checkedValues = state.checkedDataByAlias[this.def]
            if (!checkedValues) {
                state.checkedDataByAlias[this.def] = [state.data]
            } else if (checkedValues.some((value) => value === state.data)) {
                return
            } else {
                state.checkedDataByAlias[this.def].push(state.data)
            }
            const priorContexts = state.clearContexts()
            resolution.allows(state)
            state.restoreContexts(priorContexts)
        }
    }
}
