import { Regex } from "../obj/regex.js"
import { AliasNode, AliasType } from "./alias.js"
import { Base } from "./base.js"
import { IntersectionNode, IntersectionType } from "./intersection.js"
import { Keyword } from "./keyword/keyword.js"
import { ListNode, ListType } from "./list.js"
import { BigintLiteral, LiteralNode, NumberLiteral } from "./literal.js"
import { OptionalNode, OptionalType } from "./optional.js"
import { Str } from "./str.js"
import { UnionNode, UnionType } from "./union.js"

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
    expression?: Base.Parsing.Node
    chars: string[]
    location: number

    constructor(def: string, private ctx: Base.Parsing.Context) {
        this.openGroups = []
        this.branch = {}
        this.chars = [...def, "END"]
        this.location = 0
    }

    shiftBranches() {
        do {
            this.shiftBranch()
        } while (this.shouldContinueBranching())
        this.finalizeExpression()
    }

    finalizeExpression() {
        this.mergeUnion()
        if (this.chars[this.location] === "?") {
            this.shiftOptional()
        } else if (this.chars[this.location] === ")") {
            this.popGroup()
        }
    }

    shiftOptional() {
        if (this.chars[this.location + 1] !== "END") {
            throw new Error(
                `Modifier '?' is only valid at the end of a definition.`
            )
        }
        this.expression = new OptionalNode(this.expression!, this.ctx)
    }

    shouldContinueBranching() {
        if (this.chars[this.location] in expressionTerminating) {
            return false
        } else if (this.chars[this.location] === "|") {
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
            this.branch.union.children.push(this.expression!)
        }
        this.expression = undefined
        this.location++
    }

    mergeUnion() {
        if (this.branch.union) {
            this.mergeIntersection()
            this.branch.union.children.push(this.expression!)
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
            this.branch.intersection.children.push(this.expression!)
        }
        this.expression = undefined
        this.location++
    }

    mergeIntersection() {
        if (this.branch.intersection) {
            this.branch.intersection.children.push(this.expression!)
            this.expression = this.branch.intersection
            this.branch.intersection = undefined
        }
    }

    shiftBranch() {
        this.shiftBase()
        this.shiftTransforms()
    }

    shiftBase() {
        if (this.chars[this.location] === "(") {
            this.shiftGroup()
        } else if (this.chars[this.location] in literalEnclosing) {
            this.shiftEnclosed()
        } else if (this.chars[this.location] === " ") {
            this.location++
            this.shiftBase()
        } else {
            this.shiftNonLiteral()
        }
    }

    shiftGroup() {
        this.openGroups.push(this.branch)
        this.branch = {}
        this.location++
        this.shiftBranches()
    }

    popGroup() {
        const previousBranches = this.openGroups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        this.branch = previousBranches
        this.location++
    }

    shiftNonLiteral() {
        let fragment = ""
        let scanLocation = this.location
        while (!(this.chars[scanLocation] in baseTerminating)) {
            fragment += this.chars[scanLocation]
            scanLocation++
        }
        this.location = scanLocation
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
        const enclosing = this.chars[this.location]
        let content = ""
        let scanLocation = this.location + 1
        while (this.chars[scanLocation] !== enclosing) {
            content += this.chars[scanLocation]
            scanLocation++
        }
        if (enclosing === "/") {
            this.expression = new Regex.Node(new RegExp(content))
        } else {
            this.expression = new LiteralNode(content)
        }
        this.location = scanLocation + 1
    }

    shiftTransforms() {
        while (!(this.chars[this.location] in branchTerminating)) {
            if (this.chars[this.location] === "[") {
                this.shiftListToken()
            } else if (this.chars[this.location] in comparatorStarting) {
            } else if (this.chars[this.location] === " ") {
                this.location++
            } else {
                throw new Error(
                    `Invalid operator ${this.chars[this.location]}.`
                )
            }
        }
    }

    shiftListToken() {
        if (this.chars[this.location + 1] === "]") {
            this.expression = new ListNode(this.expression!, this.ctx)
            this.location += 2
        } else {
            throw new Error(`Missing expected ].`)
        }
    }
}

// const s = new Parser(
//     "boolean |   ('string'|number)[]|number[]",
//     Base.Parsing.createContext()
// )
// s.shiftBranches()

// console.log(s)
