import type { InternalSpace } from "../../scopes/space.js"
import type { Check } from "../traverse/check/check.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node<string> {
        constructor(def: string, private space: InternalSpace) {
            super(def)
        }

        check(state: Check.State) {
            this.space.resolutions
        }
    }
}
