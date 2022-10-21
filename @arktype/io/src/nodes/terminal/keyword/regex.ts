import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"
import { TypeKeyword } from "./type.js"

export namespace RegexKeyword {
    abstract class Node extends Terminal.Node {
        abstract definition: Definition

        get kind() {
            return `${this.definition as this["definition"]}Keyword` as const
        }

        traverse(
            traversal: Base.Traversal
        ): traversal is Base.Traversal<string> {
            if (!TypeKeyword.nodes.string.traverse(traversal)) {
                return false
            }
            if (!this.expression.test(traversal.data)) {
                traversal.addProblem(this)
                return false
            }
            return true
        }

        abstract readonly expression: RegExp
    }

    class EmailNode extends Node {
        readonly definition = "email"
        readonly description = "a valid email"
        expression = /^(.+)@(.+)\.(.+)$/
    }

    class AlphaonlyNode extends Node {
        readonly definition = "alphaonly"
        readonly description = "only letters"
        expression = /^[A-Za-z]+$/
    }

    class AlphanumericNode extends Node {
        readonly definition = "alphanumeric"
        readonly description = "only letters and digits"
        expression = /^[\dA-Za-z]+$/
    }

    class LowercaseNode extends Node {
        readonly definition = "lowercase"
        readonly description = "only lowercase letters"
        expression = /^[a-z]*$/
    }

    class UppercaseNode extends Node {
        readonly definition = "uppercase"
        readonly description = "only uppercase letters"
        expression = /^[A-Z]*$/
    }

    export const nodes = {
        email: new EmailNode(),
        alphaonly: new AlphaonlyNode(),
        alphanumeric: new AlphanumericNode(),
        lowercase: new LowercaseNode(),
        uppercase: new UppercaseNode()
    }

    export type Nodes = typeof nodes

    export type Definition = keyof Nodes
}
