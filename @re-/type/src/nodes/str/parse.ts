import { Regex } from "../obj/regex.js"
import { AliasNode } from "./alias.js"
import { Base } from "./base.js"
import { IntersectionNode } from "./intersection.js"
import { Keyword } from "./keyword/keyword.js"
import { ListNode } from "./list.js"
import { BigintLiteral, LiteralNode, NumberLiteral } from "./literal.js"
import { OptionalNode } from "./optional.js"
import { Str } from "./str.js"
import { UnionNode } from "./union.js"

type ExpressionTree = string | ExpressionTree[]

const expressionTerminating = {
    ")": 1,
    "?": 1,
    END: 1
}

const branchStarting = {
    "|": 1,
    "&": 1
}

const transformStarting = {
    "[": 1
}

const literalEnclosing = {
    "'": 1,
    '"': 1,
    "/": 1
}

type LiteralEnclosing = keyof typeof literalEnclosing

const comparatorStarting = {
    "<": 1,
    ">": 1,
    "=": 1
}

const branchTerminating = {
    ...expressionTerminating,
    ...branchStarting
}

const baseTerminating = {
    ...transformStarting,
    ...comparatorStarting,
    ...branchTerminating,
    " ": 1
}

type BranchState = {
    union?: UnionNode
    intersection?: IntersectionNode
    ctx?: Str.State.BranchContext
}

export class Parser {
    openGroups: BranchState[]
    branch: BranchState
    expression?: Base.Node
    chars: string[]
    scan: number

    constructor(def: string, private ctx: Base.Parsing.Context) {
        this.openGroups = []
        this.branch = {}
        this.chars = [...def, "END"]
        this.scan = 0
    }

    get lookahead() {
        return this.chars[this.scan]
    }

    get nextLookahead() {
        return this.chars[this.scan + 1]
    }

    shiftBranches() {
        do {
            this.shiftBranch()
        } while (this.shouldContinueBranching())
        this.finalizeExpression()
    }

    finalizeExpression() {
        this.mergeUnion()
        if (this.lookahead === "?") {
            this.shiftOptional()
        } else if (this.lookahead === ")") {
            this.popGroup()
        }
    }

    shiftOptional() {
        if (this.nextLookahead !== "END") {
            throw new Error(
                `Modifier '?' is only valid at the end of a definition.`
            )
        }
        this.expression = new OptionalNode(this.expression!, this.ctx)
    }

    shouldContinueBranching() {
        if (this.lookahead in expressionTerminating) {
            return false
        } else if (this.lookahead === "|") {
            this.shiftUnion()
        } else {
            this.shiftIntersection()
        }
        return true
    }

    shiftUnion() {
        this.mergeIntersection()
        if (!this.branch.union) {
            this.branch.union = new UnionNode([this.expression!], this.ctx)
        } else {
            this.branch.union.addMember(this.expression!)
        }
        this.expression = undefined
        this.scan++
    }

    mergeUnion() {
        if (this.branch.union) {
            this.mergeIntersection()
            this.branch.union.addMember(this.expression!)
            this.expression = this.branch.union
            this.branch.union = undefined
        }
    }

    shiftIntersection() {
        if (!this.branch.intersection) {
            this.branch.intersection = new IntersectionNode(
                [this.expression!],
                this.ctx
            )
        } else {
            this.branch.intersection.addMember(this.expression!)
        }
        this.expression = undefined
        this.scan++
    }

    mergeIntersection() {
        if (this.branch.intersection) {
            this.branch.intersection.addMember(this.expression!)
            this.expression = this.branch.intersection
            this.branch.intersection = undefined
        }
    }

    shiftBranch() {
        this.shiftBase()
        this.shiftTransforms()
    }

    shiftBase() {
        if (this.lookahead === "(") {
            this.shiftGroup()
        } else if (this.lookahead in literalEnclosing) {
            this.shiftEnclosed()
        } else if (this.lookahead === " ") {
            this.scan++
            this.shiftBase()
        } else {
            this.shiftNonLiteral()
        }
    }

    shiftGroup() {
        this.openGroups.push(this.branch)
        this.branch = {}
        this.scan++
        this.shiftBranches()
    }

    popGroup() {
        const previousBranches = this.openGroups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        this.branch = previousBranches
        this.scan++
    }

    shiftNonLiteral() {
        let fragment = ""
        let scanAhead = this.scan
        while (!(this.chars[scanAhead] in baseTerminating)) {
            fragment += this.chars[scanAhead]
            scanAhead++
        }
        this.scan = scanAhead
        this.reduceNonLiteral(fragment)
    }

    reduceNonLiteral(fragment: string) {
        if (Keyword.matches(fragment)) {
            this.expression = Keyword.parse(fragment)
        } else if (AliasNode.matches(fragment, this.ctx)) {
            this.expression = new AliasNode(fragment, this.ctx)
        } else if (NumberLiteral.matches(fragment)) {
            this.expression = new LiteralNode(fragment)
        } else if (BigintLiteral.matches(fragment)) {
            this.expression = new LiteralNode(fragment)
        } else if (fragment === "") {
            throw new Error("Expected an expression.")
        } else {
            throw new Error(`'${fragment}' does not exist in your space.`)
        }
    }

    shiftEnclosed() {
        const enclosing = this.lookahead
        let content = ""
        let scanAhead = this.scan + 1
        while (this.chars[scanAhead] !== enclosing) {
            content += this.chars[scanAhead]
            scanAhead++
        }
        if (enclosing === "/") {
            this.expression = new Regex.Node(new RegExp(content))
        } else {
            this.expression = new LiteralNode(content)
        }
        this.scan = scanAhead + 1
    }

    shiftTransforms() {
        while (!(this.lookahead in branchTerminating)) {
            if (this.lookahead === "[") {
                this.shiftListToken()
            } else if (this.lookahead in comparatorStarting) {
                throw new Error(`Bounds are not yet implemented.`)
            } else if (this.lookahead === " ") {
                this.scan++
            } else {
                throw new Error(`Invalid operator ${this.lookahead}.`)
            }
        }
    }

    shiftListToken() {
        if (this.nextLookahead === "]") {
            this.expression = new ListNode(this.expression!, this.ctx)
            this.scan += 2
        } else {
            throw new Error(`Missing expected ].`)
        }
    }
}
