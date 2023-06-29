import {
    throwInternalError,
    throwParseError
} from "../../../../dev/utils/src/errors.js"
import type { requireKeys } from "../../../../dev/utils/src/records.js"
import { isKeyOf } from "../../../../dev/utils/src/records.js"
import type { TypeNode } from "../../../nodes/composite/type.js"
import type { Comparator, RangeNode } from "../../../nodes/primitive/range.js"
import {
    invertedComparators,
    minComparators,
    rangeNode
} from "../../../nodes/primitive/range.js"
import type { ParseContext } from "../../../scope.js"
import { Scanner } from "../shift/scanner.js"
import type { StringifiablePrefixOperator, ValidLiteral } from "./shared.js"
import {
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnclosedGroupMessage,
    writeUnmatchedGroupCloseMessage,
    writeUnpairableComparatorMessage
} from "./shared.js"

type BranchState = {
    prefixes: StringifiablePrefixOperator[]
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
    finalizer: Scanner.FinalizingLookahead | undefined
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

    finalize(finalizer: Scanner.FinalizingLookahead) {
        if (this.groups.length) {
            return this.error(writeUnclosedGroupMessage(")"))
        }
        this.finalizeBranches()
        this.finalizer = finalizer
    }

    reduceLeftBound(limit: number | string, comparator: Comparator) {
        const invertedComparator = invertedComparators[comparator]
        if (!isKeyOf(invertedComparator, minComparators)) {
            return this.error(writeUnpairableComparatorMessage(comparator))
        }
        if (this.branches.range) {
            const min = this.branches.range.min!
            return this.error(
                writeMultipleLeftBoundsMessage(
                    `${min.limit}` as ValidLiteral,
                    min.comparator,
                    `${limit}` as ValidLiteral,
                    invertedComparator
                )
            )
        }
        this.branches.range = rangeNode([
            { comparator: invertedComparator, limit }
        ])
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

    addPrefix(prefix: StringifiablePrefixOperator) {
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
                    `${min.limit}` as ValidLiteral,
                    min.comparator
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
            ? this.branches.range.min.comparator
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
