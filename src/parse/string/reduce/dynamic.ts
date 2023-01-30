import { functors } from "../../../nodes/functors.ts"
import type { TypeNode } from "../../../nodes/node.ts"
import { intersection, isLiteralNode, union } from "../../../nodes/node.ts"
import { throwInternalError, throwParseError } from "../../../utils/errors.ts"
import { isKeyOf } from "../../../utils/generics.ts"
import type { ParseContext } from "../../definition.ts"
import { Scanner } from "../shift/scanner.ts"
import type { OpenRange } from "./shared.ts"
import {
    unclosedGroupMessage,
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnmatchedGroupCloseMessage,
    writeUnpairableComparatorMessage
} from "./shared.ts"

type BranchState = {
    range?: OpenRange
    intersection?: TypeNode
    union?: TypeNode
}

export class DynamicState {
    public readonly scanner: Scanner
    private root: TypeNode | undefined
    private branches: BranchState = {}
    private groups: BranchState[] = []

    constructor(def: string, public readonly ctx: ParseContext) {
        this.scanner = new Scanner(def)
    }

    error(message: string) {
        return throwParseError(message)
    }

    hasRoot() {
        return this.root !== undefined
    }

    ejectRootIfLimit() {
        this.assertHasRoot()
        const resolution =
            typeof this.root === "string"
                ? this.ctx.$.resolveNode(this.root)
                : this.root!
        if (isLiteralNode(resolution, "number")) {
            const limit = resolution.number.value
            this.root = undefined
            return limit
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
        this.root = functors.Array(this.ejectRoot())
    }

    intersect(node: TypeNode) {
        this.root = intersection(this.ejectRoot(), node, this.ctx)
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

    reduceLeftBound(limit: number, comparator: Scanner.Comparator) {
        if (!isKeyOf(comparator, Scanner.pairableComparators)) {
            return this.error(writeUnpairableComparatorMessage(comparator))
        }
        if (this.branches.range) {
            return this.error(
                writeMultipleLeftBoundsMessage(
                    this.branches.range[0],
                    this.branches.range[1],
                    limit,
                    comparator
                )
            )
        }
        this.branches.range = [limit, comparator]
    }

    finalizeBranches() {
        this.assertRangeUnset()
        if (this.branches.union) {
            this.pushRootToBranch("|")
            this.setRoot(this.branches.union)
        } else if (this.branches.intersection) {
            this.setRoot(
                intersection(
                    this.branches.intersection,
                    this.ejectRoot(),
                    this.ctx
                )
            )
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
        this.branches.intersection = this.branches.intersection
            ? intersection(
                  this.branches.intersection,
                  this.ejectRoot(),
                  this.ctx
              )
            : this.ejectRoot()
        if (token === "|") {
            this.branches.union = this.branches.union
                ? union(
                      this.branches.union,
                      this.branches.intersection,
                      this.ctx
                  )
                : this.branches.intersection
            delete this.branches.intersection
        }
    }

    private assertRangeUnset() {
        if (this.branches.range) {
            return this.error(
                writeOpenRangeMessage(
                    this.branches.range[0],
                    this.branches.range[1]
                )
            )
        }
    }

    reduceGroupOpen() {
        this.groups.push(this.branches)
        this.branches = {}
    }

    previousOperator() {
        return this.branches.range?.[1] ?? this.branches.intersection
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
