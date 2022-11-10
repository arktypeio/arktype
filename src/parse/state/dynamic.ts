import type { Scope, ScopeRoot } from "../../scope.js"
import type { DynamicTypeName } from "../../utils/dynamicTypes.js"
import type { keyOrPartialKeySet, partialRecord } from "../../utils/generics.js"
import { isKeyOf, satisfies } from "../../utils/generics.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { throwParseError } from "../common.js"
import { buildUnpairedLeftBoundMessage } from "../operator/bounds/left.js"
import type {
    Attribute,
    AttributeKey,
    Attributes,
    ReadonlyAttributes
} from "./attributes/attributes.js"
import { operateAttribute } from "./attributes/operations.js"
import { AttributeState } from "./attributes/state.js"
import { Scanner } from "./scanner.js"

// type BaseDynamic = {
//     root: AttributeState
//     branches: DynamicOpenBranches
//     groups: DynamicOpenBranches[]
//     scanner: Scanner
//     context: DynamicParserContext
// }

export type OpenRange = [limit: number, comparator: Scanner.PairableComparator]

type DynamicOpenBranches = {
    range?: OpenRange
    union?: Attributes[]
    intersection?: Attributes[]
}

export class DynamicState {
    public readonly scanner: Scanner
    private root: Attributes | undefined
    private openBranches: DynamicOpenBranches = {}

    constructor(def: string, public readonly scope: Scope) {
        this.scanner = new Scanner(def)
    }

    error(message: string) {
        return throwParseError(message)
    }

    setRoot(attributes: Attributes) {
        if (this.root !== undefined) {
            return throwInternalError(
                "Unexpected attempt to overwrite state root"
            )
        }
        this.root = attributes
    }

    finalize() {
        return this.root!
    }

    finalizeBranches() {
        if (this.openBranches.range) {
            return this.error(
                buildUnpairedLeftBoundMessage(
                    this.openBranches.range[0],
                    this.openBranches.range[1]
                )
            )
        }
        if (this.openBranches.intersection) {
            this.mergeIntersection()
        }
        if (this.openBranches.union) {
            this.mergeUnion()
        }
    }

    hasRoot() {
        return true
    }

    private mergeIntersection() {}

    private mergeUnion() {}
}
