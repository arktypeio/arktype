import { intersection } from "../../nodes/intersection.js"
import type { MorphName } from "../../nodes/morph.js"
import { morph } from "../../nodes/morph.js"
import type { Node } from "../../nodes/node.js"
import { union } from "../../nodes/union.js"
import type { ScopeRoot } from "../../scope.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import { isKeyOf } from "../../utils/generics.js"
import { hasType } from "../../utils/typeOf.js"
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
    "|"?: Node
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
        const maybeNumberRoot = hasType(this.root, "object") && this.root.number
        if (
            hasType(maybeNumberRoot, "object", "dict") &&
            maybeNumberRoot.literal !== undefined
        ) {
            this.root = undefined
            return maybeNumberRoot.literal
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

    setRoot(node: Node) {
        this.assertUnsetRoot()
        this.root = node
    }

    morphRoot(name: MorphName) {
        this.root = morph(name, this.ejectRoot())
    }

    intersect(node: Node) {
        this.root = intersection(this.ejectRoot(), node, this.scope)
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
            this.pushRootToBranch("|")
            this.setRoot(this.branches["|"])
        } else if (this.branches["&"]) {
            this.setRoot(
                intersection(this.branches["&"], this.ejectRoot(), this.scope)
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

    pushRootToBranch(token: Scanner.BranchToken) {
        this.assertRangeUnset()
        this.branches["&"] = this.branches["&"]
            ? intersection(this.branches["&"], this.ejectRoot(), this.scope)
            : this.ejectRoot()
        if (token === "|") {
            this.branches["|"] = this.branches["|"]
                ? union(this.branches["|"], this.branches["&"], this.scope)
                : this.branches["&"]
            delete this.branches["&"]
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
