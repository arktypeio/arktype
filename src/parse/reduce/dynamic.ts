import { intersection } from "../../nodes/intersection.js"
import type { MorphName } from "../../nodes/morph.js"
import { morph } from "../../nodes/morph.js"
import type { Node } from "../../nodes/node.js"
import { union } from "../../nodes/prune.js"
import { isNever } from "../../nodes/types/degenerate.js"
import type { ScopeRoot } from "../../scope.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import { isKeyOf, listFrom } from "../../utils/generics.js"
import { Scanner } from "./scanner.js"
import type { OpenRange } from "./shared.js"
import {
    buildMultipleLeftBoundsMessage,
    buildOpenRangeMessage,
    buildUnmatchedGroupCloseMessage,
    buildUnpairableComparatorMessage,
    unclosedGroupMessage
} from "./shared.js"

type BranchState = {
    range?: OpenRange
    "&"?: Node
    "|"?: Node[]
}

export class DynamicState {
    public readonly scanner: Scanner
    private root: Node | undefined
    private branches: BranchState = {}
    private groups: BranchState[] = []

    constructor(def: string, public readonly scope: ScopeRoot) {
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
        // if (this.root?.value) {
        //     const value = this.ejectRoot().value!
        //     if (typeof value === "number") {
        //         return value
        //     }
        //     this.error(buildUnboundableMessage(`${value}`))
        // }
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

    setRoot(node: Node) {
        this.assertUnsetRoot()
        this.root = node
    }

    morphRoot(name: MorphName) {
        this.root = morph(name, this.ejectRoot())
    }

    intersect(node: Node) {
        this.assertHasRoot()
        this.root = intersection(this.root!, node, this.scope)
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
            return this.error(buildUnpairableComparatorMessage(comparator))
        }
        if (this.branches.range) {
            return this.error(
                buildMultipleLeftBoundsMessage(
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
        if (this.branches["|"]) {
            this.pushBranch("|")
            this.mergeUnion()
        } else if (this.branches["&"]) {
            this.setRoot(
                intersection(this.ejectRoot(), this.branches["&"], this.scope)
            )
        }
    }

    finalizeGroup() {
        this.finalizeBranches()
        const topBranchState = this.groups.pop()
        if (!topBranchState) {
            return this.error(
                buildUnmatchedGroupCloseMessage(this.scanner.unscanned)
            )
        }
        this.branches = topBranchState
    }

    pushBranch(token: Scanner.BranchToken) {
        this.assertRangeUnset()
        this.branches["&"] = this.branches["&"]
            ? intersection(this.branches["&"], this.ejectRoot(), this.scope)
            : this.ejectRoot()
        if (token === "|") {
            this.branches["|"] ??= []
            const branches = listFrom(this.branches["&"])
            delete this.branches["&"]
            this.branches["|"].push(...branches)
        }
    }

    private assertRangeUnset() {
        if (this.branches.range) {
            return this.error(
                buildOpenRangeMessage(
                    this.branches.range[0],
                    this.branches.range[1]
                )
            )
        }
    }

    private mergeUnion() {
        if (!this.branches["|"]) {
            return
        }
        this.setRoot(union(this.branches["|"], this.scope))
    }

    reduceGroupOpen() {
        this.groups.push(this.branches)
        this.branches = {}
    }

    previousOperator() {
        return this.branches.range?.[1] ?? this.branches["&"]
            ? "&"
            : this.branches["|"]
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
