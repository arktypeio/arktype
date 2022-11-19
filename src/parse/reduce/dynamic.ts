import type { DynamicScope } from "../../scope.js"
import { isKeyOf } from "../../utils/generics.js"
import { buildUnboundableMessage } from "../ast.js"
import { throwInternalError, throwParseError } from "../errors.js"
import type {
    Attribute,
    AttributeKey,
    Attributes
} from "./attributes/attributes.js"
import { deserializeBound, deserializeRange } from "./attributes/bounds.js"
import {
    assignAttributeIntersection,
    assignIntersection
} from "./attributes/intersection.js"
import type { MorphName } from "./attributes/morph.js"
import { morph } from "./attributes/morph.js"
import { compileUnion } from "./attributes/union/compile.js"
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
        if (this.root?.value) {
            const value = this.ejectRoot().value!
            if (typeof value === "number") {
                return value
            }
            this.error(buildUnboundableMessage(`${value}`))
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
        this.root = assignAttributeIntersection(this.root!, k, v)
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
            this.addAttribute("bounds", deserializeBound(comparator, limit))
            return
        }
        if (!isKeyOf(comparator, Scanner.pairableComparators)) {
            return this.error(buildUnpairableComparatorMessage(comparator))
        }
        this.addAttribute(
            "bounds",
            deserializeRange(
                this.branches.range[1],
                this.branches.range[0],
                comparator,
                limit
            )
        )
        delete this.branches.range
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
                assignIntersection(branches.pop()!, branches.pop()!)
            )
        }
        this.setRoot(branches.pop()!)
    }

    private mergeUnion() {
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
