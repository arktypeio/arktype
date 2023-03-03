import type { Node } from "../../../nodes/node.ts"
import {
    isLiteralNode,
    rootIntersection,
    rootUnion,
    toArrayNode
} from "../../../nodes/node.ts"
import type { LowerBound } from "../../../nodes/rules/range.ts"
import { minComparators } from "../../../nodes/rules/range.ts"
import { throwInternalError, throwParseError } from "../../../utils/errors.ts"
import { isKeyOf } from "../../../utils/generics.ts"
import { stringify } from "../../../utils/serialize.ts"
import type { ParseContext } from "../../definition.ts"
import { Scanner } from "../shift/scanner.ts"
import {
    unclosedGroupMessage,
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnmatchedGroupCloseMessage,
    writeUnpairableComparatorMessage
} from "./shared.ts"

type BranchState = {
    range?: LowerBound
    intersection?: Node
    union?: Node
}

export class DynamicState {
    public readonly scanner: Scanner
    private root: Node | undefined
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

    resolveRoot() {
        this.assertHasRoot()
        return this.ctx.type.scope.resolveTypeNode(this.root!)
    }

    rootToString() {
        this.assertHasRoot()
        return stringify(this.root)
    }

    ejectRootIfLimit() {
        this.assertHasRoot()
        const resolution =
            typeof this.root === "string"
                ? this.ctx.type.scope.resolveNode(this.root)
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
            /* c8 ignore next */
            return throwInternalError("Unexpected interaction with unset root")
        }
    }

    private assertUnsetRoot() {
        if (this.root !== undefined) {
            /* c8 ignore next */
            return throwInternalError("Unexpected attempt to overwrite root")
        }
    }

    setRoot(node: Node) {
        this.assertUnsetRoot()
        this.root = node
    }

    rootToArray() {
        this.root = toArrayNode(this.ejectRoot())
    }

    intersect(node: Node) {
        this.root = rootIntersection(this.ejectRoot(), node, this.ctx.type)
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
        const invertedComparator = Scanner.invertedComparators[comparator]
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
            this.setRoot(
                rootIntersection(
                    this.branches.intersection,
                    this.ejectRoot(),
                    this.ctx.type
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
            ? rootIntersection(
                  this.branches.intersection,
                  this.ejectRoot(),
                  this.ctx.type
              )
            : this.ejectRoot()
        if (token === "|") {
            this.branches.union = this.branches.union
                ? rootUnion(
                      this.branches.union,
                      this.branches.intersection,
                      this.ctx.type
                  )
                : this.branches.intersection
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
