import type { Comparator } from "../../../nodes/range.js"
import {
    invertedComparators,
    minComparators,
    RangeNode
} from "../../../nodes/range.js"
import type { TypeNode } from "../../../nodes/type.js"
import { throwInternalError, throwParseError } from "../../../utils/errors.js"
import type { requireKeys } from "../../../utils/generics.js"
import { isKeyOf } from "../../../utils/generics.js"
import type { ParseContext } from "../../definition.js"
import { Scanner } from "../shift/scanner.js"
import {
    unclosedGroupMessage,
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnmatchedGroupCloseMessage,
    writeUnpairableComparatorMessage
} from "./shared.js"

type BranchState = {
    range?: RangeNode
    intersection?: TypeNode
    union?: TypeNode
}

export type DynamicStateWithRoot = requireKeys<DynamicState, "root">

export class DynamicState {
    readonly scanner: Scanner
    root: TypeNode | undefined
    branches: BranchState = {}
    groups: BranchState[] = []

    constructor(def: string, public readonly ctx: ParseContext) {
        this.scanner = new Scanner(def)
    }

    error(message: string) {
        return throwParseError(message)
    }

    hasRoot(): this is DynamicStateWithRoot {
        return this.root !== undefined
    }

    setRoot(root: TypeNode) {
        this.root = root
    }

    ejectRoot() {
        if (!this.root) {
            return throwInternalError(
                `Unexpected attempt to eject an unset root.`
            )
        }
        const root = this.root
        this.root = undefined
        return root
    }

    finalize() {
        if (this.groups.length) {
            return this.error(unclosedGroupMessage)
        }
        this.finalizeBranches()
        this.scanner.finalized = true
    }

    reduceLeftBound(limit: number, comparator: Comparator) {
        const invertedComparator = invertedComparators[comparator]
        if (!isKeyOf(invertedComparator, minComparators)) {
            return this.error(writeUnpairableComparatorMessage(comparator))
        }
        if (this.branches.range) {
            const { limit, comparator } = this.branches.range.lowerBound!
            return this.error(
                writeMultipleLeftBoundsMessage(
                    `${limit}`,
                    comparator,
                    `${limit}`,
                    invertedComparator
                )
            )
        }
        this.branches.range = new RangeNode({ [invertedComparator]: limit })
    }

    finalizeBranches() {
        this.assertRangeUnset()
        if (this.branches.union) {
            this.pushRootToBranch("|")
            this.root = this.branches.union
        } else if (this.branches.intersection) {
            this.root = this.ejectRoot().and(this.branches.intersection)
        }
    }

    finalizeGroup() {
        this.finalizeBranches()
        const topBranchState = this.groups.pop()
        if (!topBranchState) {
            return this.error(
                writeUnmatchedGroupCloseMessage(this.scanner.unscanned)
            )
        }
        this.branches = topBranchState
    }

    pushRootToBranch(token: Scanner.BranchToken) {
        this.assertRangeUnset()
        this.branches.intersection =
            this.branches.intersection?.and(this.ejectRoot()) ??
            this.ejectRoot()
        if (token === "|") {
            this.branches.union =
                this.branches.union?.or(this.branches.intersection) ??
                this.branches.intersection
            delete this.branches.intersection
        }
    }

    private assertRangeUnset() {
        if (this.branches.range) {
            const { limit, comparator } = this.branches.range.lowerBound!
            return this.error(writeOpenRangeMessage(`${limit}`, comparator))
        }
    }

    reduceGroupOpen() {
        this.groups.push(this.branches)
        this.branches = {}
    }

    previousOperator() {
        return this.branches.range?.lowerBound?.comparator ??
            this.branches.intersection
            ? "&"
            : this.branches.union
            ? "|"
            : undefined
    }

    shiftedByOne() {
        this.scanner.shift()
        return this
    }
}
