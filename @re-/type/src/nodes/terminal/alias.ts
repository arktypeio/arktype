import type { Check } from "../traverse/check.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node<string> {
        constructor(def: string) {
            super(def)
        }

        allows(state: Check.State) {
            return state.resolve(this.def).check(state)
        }
    }
}
