import type { ScopeRoot } from "../../scope.js"
import { isKeyOf } from "../../utils/generics.js"
import { buildUnboundableMessage } from "../ast.js"
import { throwInternalError, throwParseError } from "../errors.js"
import type {
    Attribute,
    AttributeKey,
    Attributes
} from "./attributes/attributes.js"
import type { MorphName } from "./attributes/morph.js"
import { morph } from "./attributes/morph.js"
import { intersect } from "./attributes/operations.js"
import { compress } from "./attributes/union/compress.js"
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
    "&": Attributes[]
    "|": Attributes[]
}

const initializeBranches = (): BranchState => ({ "&": [], "|": [] })

export class DynamicState {
    public readonly scanner: Scanner
    private root: Attributes | null | undefined
    private branches: BranchState = initializeBranches()
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
        if (this.root?.value) {
            const value = this.ejectRoot().value!
            if (typeof value === "number") {
                return value
            }
            this.error(buildUnboundableMessage(`${value}`))
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

    setRoot(attributes: Attributes | null) {
        this.assertUnsetRoot()
        this.root = attributes
    }

    morphRoot(name: MorphName) {
        this.root = morph(name, this.ejectRoot())
    }

    addAttribute<k extends AttributeKey>(k: k, v: Attribute<k>) {
        this.assertHasRoot()
        this.root = intersect(this.root!, { [k]: v }, this.scope)
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
        if (this.branches["&"].length) {
            this.pushBranch("&")
            this.mergeIntersection()
        }
        if (this.branches["|"].length) {
            this.pushBranch("|")
            this.mergeUnion()
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
        this.branches["&"].push(this.ejectRoot())
        if (token === "|") {
            this.mergeIntersection()
            this.branches["|"].push(this.ejectRoot())
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

    private mergeIntersection() {
        const branches = this.branches["&"]
        while (branches.length > 1) {
            branches.unshift(
                intersect(branches.pop()!, branches.pop()!, this.scope)
            )
        }
        this.setRoot(branches.pop()!)
    }

    private mergeUnion() {
        const viableBranches = this.branches["|"].filter(
            (branch) => branch.contradiction === undefined
        )
        if (viableBranches.length === 0) {
            return {
                contradiction: buildNoViableBranchesMessage(this.branches["|"])
            }
        }
        this.setRoot(compress(viableBranches, this.scope))
    }

    reduceGroupOpen() {
        this.groups.push(this.branches)
        this.branches = initializeBranches()
    }

    previousOperator() {
        return this.branches.range?.[1] ?? this.branches["&"].length
            ? "&"
            : this.branches["|"].length
            ? "|"
            : undefined
    }

    shiftedByOne() {
        this.scanner.shift()
        return this
    }
}

export const buildNoViableBranchesMessage = (branches: Attributes[]) => {
    let message = "All branches are empty:\n"
    for (const branch of branches) {
        message += branch.contradiction
    }
    return message
}

const ejectedProxy = new Proxy(
    {},
    {
        get: () =>
            throwInternalError(
                `Unexpected attempt to access ejected attributes`
            )
    }
)
