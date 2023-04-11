import type {
    BoundContext,
    Comparator,
    MinComparator
} from "../../../nodes/range.js"
import { invertedComparators, minComparators } from "../../../nodes/range.js"
import type { TypeNode } from "../../../nodes/type.js"
import { throwInternalError, throwParseError } from "../../../utils/errors.js"
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
    range?: BoundContext<MinComparator>
    intersection?: TypeNode
    union?: TypeNode
}

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

    ejectRootIfLimit() {
        this.assertHasRoot()
        const value = this.root?.literalValue?.child
        if (typeof value === "number") {
            this.root = undefined
            return value
        }
    }

    ejectRangeIfOpen() {
        if (this.branches.range) {
            const range = this.branches.range
            delete this.branches.range
            return range
        }
    }

    private assertHasRoot() {
        if (this.root === undefined) {
            return throwInternalError("Unexpected interaction with unset root")
        }
    }

    private assertUnsetRoot() {
        if (this.root !== undefined) {
            return throwInternalError("Unexpected attempt to overwrite root")
        }
    }

    setRoot(node: TypeNode) {
        this.assertUnsetRoot()
        this.root = node
    }

    rootToArray() {
        this.root = this.ejectRoot().toArray()
    }

    intersect(node: TypeNode) {
        this.root = this.ejectRoot().and(node)
    }

    private ejectRoot() {
        this.assertHasRoot()
        const root = this.root!
        this.root = undefined
        return root
    }

    ejectFinalizedRoot() {
        this.assertHasRoot()
        const root = this.root!
        this.root = ejectedProxy
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
            return this.error(
                writeMultipleLeftBoundsMessage(
                    `${this.branches.range.limit}`,
                    this.branches.range.comparator,
                    `${limit}`,
                    invertedComparator
                )
            )
        }
        this.branches.range = {
            limit,
            comparator: invertedComparator
        }
    }

    finalizeBranches() {
        this.assertRangeUnset()
        if (this.branches.union) {
            this.pushRootToBranch("|")
            this.setRoot(this.branches.union)
        } else if (this.branches.intersection) {
            this.setRoot(this.branches.intersection.and(this.ejectRoot()))
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
            return this.error(
                writeOpenRangeMessage(
                    `${this.branches.range.limit}`,
                    this.branches.range.comparator
                )
            )
        }
    }

    reduceGroupOpen() {
        this.groups.push(this.branches)
        this.branches = {}
    }

    previousOperator() {
        return this.branches.range?.comparator ?? this.branches.intersection
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

const ejectedProxy: any = new Proxy(
    {},
    {
        get: () =>
            throwInternalError(
                `Unexpected attempt to access ejected attributes`
            )
    }
)
