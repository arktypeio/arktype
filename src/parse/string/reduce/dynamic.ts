import type { Comparator } from "../../../nodes/constraints/range.js"
import {
    boundToComparator,
    invertedComparators,
    minComparators,
    RangeNode
} from "../../../nodes/constraints/range.js"
import type { TypeNode } from "../../../nodes/type.js"
import { throwInternalError, throwParseError } from "../../../utils/errors.js"
import type { requireKeys } from "../../../utils/records.js"
import { isKeyOf } from "../../../utils/records.js"
import type { ParseContext } from "../../definition.js"
import { Scanner } from "../shift/scanner.js"
import type { Prefix } from "./shared.js"
import {
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnclosedGroupMessage,
    writeUnmatchedGroupCloseMessage,
    writeUnpairableComparatorMessage
} from "./shared.js"

type BranchState = {
    prefixes: Prefix[]
    range?: RangeNode
    intersection?: TypeNode
    union?: TypeNode
}

export type DynamicStateWithRoot = requireKeys<DynamicState, "root">

export class DynamicState {
    readonly scanner: Scanner
    root: TypeNode | undefined
    branches: BranchState = {
        prefixes: []
    }
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
            return this.error(writeUnclosedGroupMessage(")"))
        }
        this.finalizeBranches()
        this.scanner.finalized = true
        return this as DynamicStateWithRoot
    }

    reduceLeftBound(limit: number, comparator: Comparator) {
        const invertedComparator = invertedComparators[comparator]
        if (!isKeyOf(invertedComparator, minComparators)) {
            return this.error(writeUnpairableComparatorMessage(comparator))
        }
        if (this.branches.range) {
            const min = this.branches.range.min!
            return this.error(
                writeMultipleLeftBoundsMessage(
                    `${limit}`,
                    boundToComparator("min", min),
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
            this.pushRootToBranch("&")
            this.root = this.branches.intersection
        } else {
            this.applyPrefixes()
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

    addPrefix(prefix: Prefix) {
        this.branches.prefixes.push(prefix)
    }

    applyPrefixes() {
        while (this.branches.prefixes.length) {
            const lastPrefix = this.branches.prefixes.pop()!
            this.root =
                lastPrefix === "keyof"
                    ? this.root!.keyof()
                    : throwInternalError(`Unexpected prefix '${lastPrefix}'`)
        }
    }

    pushRootToBranch(token: "|" | "&") {
        this.assertRangeUnset()
        this.applyPrefixes()
        const root = this.ejectRoot()
        this.branches.intersection =
            this.branches.intersection?.and(root) ?? root
        if (token === "|") {
            this.branches.union =
                this.branches.union?.or(this.branches.intersection) ??
                this.branches.intersection
            delete this.branches.intersection
        }
    }

    private assertRangeUnset() {
        if (this.branches.range) {
            const min = this.branches.range.min!
            return this.error(
                writeOpenRangeMessage(
                    `${min.limit}`,
                    boundToComparator("min", min)
                )
            )
        }
    }

    reduceGroupOpen() {
        this.groups.push(this.branches)
        this.branches = {
            prefixes: []
        }
    }

    previousOperator() {
        return this.branches.range?.min
            ? boundToComparator("min", this.branches.range.min)
            : this.branches.prefixes.at(-1) ?? this.branches.intersection
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
