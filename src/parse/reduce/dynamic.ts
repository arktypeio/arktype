import type { DynamicScope } from "../../scope.js"
import { throwInternalError, throwParseError } from "../errors.js"
import type { Attributes } from "./attributes/attributes.js"
import type { MorphName } from "./attributes/morph.js"
import { morphs } from "./attributes/morph.js"
import { Scanner } from "./scanner.js"
import {
    buildOpenRangeMessage,
    buildUnmatchedGroupCloseMessage,
    unclosedGroupMessage
} from "./shared.js"

type OpenRange = [limit: number, comparator: Scanner.PairableComparator]

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

    morphRoot(to: MorphName) {
        this.assertHasRoot()
        this.root = morphs[to](this.root!)
    }

    private unsetRoot() {
        this.assertHasRoot()
        const root = this.root!
        this.root = undefined
        return root
    }

    ejectRoot() {
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

    finalizeBranches() {
        this.assertRangeUnset()
        if (this.branches["&"]) {
            this.mergeIntersection()
        }
        if (this.branches["|"]) {
            this.mergeUnion()
        }
    }

    finalizeGroup() {
        this.finalizeBranches()
        const topBranchState = this.groups.pop()
        if (topBranchState) {
            this.branches = topBranchState
        }
        this.error(buildUnmatchedGroupCloseMessage(this.scanner.unscanned))
    }

    pushBranch(token: Scanner.BranchToken) {
        this.assertRangeUnset()
        this.branches[token].push(this.unsetRoot())
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

    private mergeIntersection() {}

    private mergeUnion() {}

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

const compileIntersection = (branches: Attributes[]) => {
    // while (branches.length > 1) {
    //     branches.unshift(intersect(branches.pop()!, branches.pop()!))
    // }
    return branches[0]
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
