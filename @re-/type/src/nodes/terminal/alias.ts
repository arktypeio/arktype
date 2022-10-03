import type { Check } from "../traverse/check/check.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node<string> {
        constructor(def: string) {
            super(def)
        }

        check(state: Check.State) {
            return state.resolve(this.def).check(state)
        }
    }
}
