// TODO: Remove this
/* eslint-disable max-lines */
import { Base } from "../base/index.js"
import {
    Boundable,
    Bounds,
    IntersectionNode,
    isBoundable,
    ListNode,
    OptionalNode,
    UnionNode
} from "../nonTerminal/index.js"
import {
    AliasNode,
    BigintLiteralNode,
    Keyword,
    NumberLiteralNode,
    RegexNode,
    StringLiteralNode
} from "../terminal/index.js"
import { ParserState } from "./state.js"

export class Parser {
    s: ParserState.state

    constructor(def: string, private ctx: Base.Parsing.Context) {
        this.s = new ParserState.initialize(def)
    }

    shiftBranches() {
        do {
            this.shiftBranch()
        } while (this.shouldContinueBranching())
        this.finalizeExpression()
    }

    finalizeExpression() {
        this.mergeUnion()
        if (this.s.lookahead === "?") {
            this.shiftOptional()
        } else if (this.s.lookahead === ")") {
            this.popGroup()
        }
    }

    shiftOptional() {
        if (this.s.nextLookahead !== "END") {
            throw new Error(
                `Modifier '?' is only valid at the end of a definition.`
            )
        }
        this.s.root = new OptionalNode(this.s.root!, this.ctx)
    }

    shouldContinueBranching() {
        if (this.s.lookahead in expressionTerminating) {
            return false
        } else if (this.s.lookahead === "|") {
            this.shiftUnion()
        } else {
            this.shiftIntersection()
        }
        return true
    }

    shiftUnion() {
        this.mergeIntersection()
        if (!this.s.branches.union) {
            this.s.branches.union = new UnionNode([this.s.root!], this.ctx)
        } else {
            this.s.branches.union.addMember(this.s.root!)
        }
        this.s.root = undefined
        this.s.scan++
    }

    mergeUnion() {
        if (this.s.branches.union) {
            this.mergeIntersection()
            this.s.branches.union.addMember(this.s.root!)
            this.s.root = this.s.branches.union
            this.s.branches.union = undefined
        }
    }

    shiftIntersection() {
        if (!this.s.branches.intersection) {
            this.s.branches.intersection = new IntersectionNode(
                [this.s.root!],
                this.ctx
            )
        } else {
            this.s.branches.intersection.addMember(this.s.root!)
        }
        this.s.root = undefined
        this.s.scan++
    }

    mergeIntersection() {
        if (this.s.branches.intersection) {
            this.s.branches.intersection.addMember(this.s.root!)
            this.s.root = this.s.branches.intersection
            this.s.branches.intersection = undefined
        }
    }

    shiftBranch() {
        this.shiftBase()
        this.shiftTransforms()
    }

    shiftBase() {
        if (this.s.lookahead === "(") {
            this.shiftGroup()
        } else if (this.s.lookahead in literalEnclosing) {
            this.shiftEnclosed()
        } else if (this.s.lookahead === " ") {
            this.s.scan++
            this.shiftBase()
        } else {
            this.shiftNonLiteral()
        }
    }

    shiftNonLiteral() {
        let fragment = ""
        let scanAhead = this.s.scan
        while (!(this.s.chars[scanAhead] in baseTerminating)) {
            fragment += this.s.chars[scanAhead]
            scanAhead++
        }
        this.s.scan = scanAhead
        this.reduceNonLiteral(fragment)
    }

    reduceNonLiteral(fragment: string) {
        if (Keyword.matches(fragment)) {
            this.s.root = Keyword.parse(fragment)
        } else if (AliasNode.matches(fragment, this.ctx)) {
            this.s.root = new AliasNode(fragment, this.ctx)
        } else if (NumberLiteralNode.matches(fragment)) {
            this.s.root = new NumberLiteralNode(fragment)
        } else if (BigintLiteralNode.matches(fragment)) {
            this.s.root = new BigintLiteralNode(fragment)
        } else if (fragment === "") {
            throw new Error("Expected an expression.")
        } else {
            throw new Error(`'${fragment}' does not exist in your space.`)
        }
    }

    shiftEnclosed() {
        const enclosedBy = this.s.lookahead as LiteralEnclosing
        let text = ""
        let scanAhead = this.s.scan + 1
        while (this.s.chars[scanAhead] !== enclosedBy) {
            if (this.s.chars[scanAhead] === "END") {
                throw new Error(
                    `'${enclosedBy}${text} requires a closing ${enclosedBy}.`
                )
            }
            text += this.s.chars[scanAhead]
            scanAhead++
        }
        if (enclosedBy === "/") {
            this.s.root = new RegexNode(new RegExp(text))
        } else {
            this.s.root = new StringLiteralNode(text, enclosedBy)
        }
        this.s.scan = scanAhead + 1
    }

    shiftTransforms() {
        while (!(this.s.lookahead in branchTerminating)) {
            if (this.s.lookahead === "[") {
                this.shiftListToken()
            } else if (this.s.lookahead in comparatorStarting) {
                throw new Error(`Bounds are not yet implemented.`)
            } else if (this.s.lookahead === " ") {
                this.s.scan++
            } else {
                throw new Error(`Invalid operator ${this.s.lookahead}.`)
            }
        }
    }

    shiftListToken() {
        if (this.s.nextLookahead === "]") {
            this.s.root = new ListNode(this.s.root!, this.ctx)
            this.s.scan += 2
        } else {
            throw new Error(`Missing expected ].`)
        }
    }

    // shiftComparatorToken() {
    //     if (this.s.nextLookahead === "=") {
    //         this.s.scan += 2
    //         this.reduceBound(
    //             `${this.s.lookahead}${this.s.nextLookahead}` as Bounds.Token
    //         )
    //     } else if (this.s.lookahead === "=") {
    //         throw new Error(`= is not a valid comparator. Use == instead.`)
    //     } else {
    //         this.s.scan++
    //         this.reduceBound(this.s.lookahead as Bounds.Token)
    //     }
    // }

    // reduceBound(token: Bounds.Token) {
    //     if (isBoundable(this.s.root!)) {
    //         this.reduceRightBound(this.s.root!, token)
    //     } else if (this.s.root instanceof NumberLiteralNode) {
    //         this.reduceLeftBound(this.s.root.value, token)
    //     } else {
    //         throw new Error(
    //             `Left side of comparator ${token} must be a number literal or boundable definition (got ${this.s.root!.toString()}).`
    //         )
    //     }
    // }

    // reduceRightBound(expression: Boundable, token: Bounds.Token) {
    //     if (this.s.bounds) {
    //         throw new Error(
    //             `Right side of comparator ${token} cannot be bounded more than once.`
    //         )
    //     }
    //     this.s.bounds.right = true
    //     const bounded = this.s.root
    //     this.shiftBranch()
    //     if (this.s.root instanceof NumberLiteralNode) {
    //         this.s.root = bounded
    //         // Apply bound
    //     } else {
    //         throw new Error(
    //             `Right side of comparator ${token} must be a number literal.`
    //         )
    //     }
    // }

    // reduceLeftBound(value: number, token: Bounds.Token) {
    //     if (this.branches.ctx.leftBounded) {
    //         throw new Error(
    //             `Left side of comparator ${token} cannot be bounded more than once.`
    //         )
    //     }
    //     this.branches.ctx.leftBounded = true
    //     this.shiftBranch()
    //     if (isBoundable(this.s.root!)) {
    //         // Apply bound
    //     } else {
    //         throw new Error(
    //             `Right side of comparator ${token} must be a numbed-or-string-typed keyword or a list-typed expression.`
    //         )
    //     }
    // }
}
