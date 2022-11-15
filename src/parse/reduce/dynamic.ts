import type { DynamicScope } from "../../scope.js"
import { isKeyOf } from "../../utils/generics.js"
import { deserializePrimitive } from "../../utils/primitiveSerialization.js"
import { buildUnboundableMessage } from "../ast.js"
import { throwInternalError, throwParseError } from "../errors.js"
import type {
    Attribute,
    AttributeKey,
    Attributes
} from "./attributes/attributes.js"
import type { MorphName } from "./attributes/morph.js"
import { morph } from "./attributes/morph.js"
import { applyOperation, applyOperationAtKey } from "./attributes/operations.js"
import { Scanner } from "./scanner.js"
import type { OpenRange } from "./shared.js"
import {
    buildMultipleLeftBoundsMessage,
    buildOpenRangeMessage,
    buildUnmatchedGroupCloseMessage,
    buildUnpairableComparatorMessage,
    unclosedGroupMessage
} from "./shared.js"
import { compileUnion } from "./union/compile.js"

type BranchState = {
    range?: OpenRange
    "&": Attributes[]
    "|": Attributes[]
}

const initializeBranches = (): BranchState => ({ "&": [], "|": [] })

export class DynamicState {
    public readonly scanner: Scanner
    private root: Attributes | undefined
    private branches: BranchState = initializeBranches()
    private groups: BranchState[] = []

    constructor(def: string, public readonly scope: DynamicScope) {
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
        if (this.root!.value) {
            const serializedValue = this.ejectRoot().value!
            const value = deserializePrimitive(serializedValue)
            if (typeof value === "number") {
                return value
            }
            this.error(buildUnboundableMessage(serializedValue))
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

    setRoot(attributes: Attributes) {
        this.assertUnsetRoot()
        this.root = attributes
    }

    morphRoot(name: MorphName) {
        this.root = morph(name, this.ejectRoot())
    }

    intersectionAtKey<k extends AttributeKey>(k: k, v: Attribute<k>) {
        const result = applyOperationAtKey("&", this.ejectRoot(), k, v)
        if (result === null) {
            throw new Error("Empty intersection.")
        }
        this.root = result
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

    reduceRightBound(comparator: Scanner.Comparator, limit: number) {
        if (!this.branches.range) {
            this.intersectionAtKey("bounds", `${comparator}${limit}`)
            return
        }
        if (!isKeyOf(comparator, Scanner.pairableComparators)) {
            return this.error(buildUnpairableComparatorMessage(comparator))
        }
        this.intersectionAtKey(
            "bounds",
            `${comparator === "<" ? ">" : ">="}${
                this.branches.range[0]
            }${comparator}${limit}`
        )
        delete this.branches.range
    }

    finalizeBranches() {
        this.assertRangeUnset()
        if (this.branches["&"].length) {
            this.mergeIntersection()
        }
        if (this.branches["|"].length) {
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
        this.branches[token].push(this.ejectRoot())
    }

    pushRange(min: number, comparator: Scanner.PairableComparator) {
        this.assertRangeUnset()
        this.branches.range = [min, comparator]
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
        this.pushBranch("&")
        const branches = this.branches["&"]
        while (branches.length > 1) {
            const result = applyOperation("&", branches.pop()!, branches.pop()!)
            if (result === null) {
                return this.error("Empty intersection.")
            }
            branches.unshift(result)
        }
        this.setRoot(branches.pop()!)
    }

    private mergeUnion() {
        this.pushBranch("|")
        this.setRoot(compileUnion(this.branches["|"]))
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

const ejectedProxy = new Proxy(
    {},
    {
        get: () =>
            throwInternalError(
                `Unexpected attempt to access ejected attributes`
            )
    }
)
