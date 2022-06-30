import { Base } from "../base/index.js"
export { Base }

export namespace StrBase {
    // Matches groups between token excluding literals
    // Try it here: https://regexr.com/6nua3
    export const createSplittableMatcher = (token: "|" | "&" | "|&") =>
        // Note: Also matches consecutive instances of token e.g. in "string||number"
        // so we can detect syntax errors which would otherwise just be ignored.
        new RegExp(`'[^']*'|"[^"]*"|/[^/]*/|[^${token}]+|[${token}]{2,}`, "g")

    export abstract class Leaf<
        DefType extends string
    > extends Base.Leaf<DefType> {
        defToString() {
            return this.def
        }
    }

    export abstract class Branch<
        DefType extends string,
        Next = Base.Parsing.Node
    > extends Base.Branch<DefType, Next> {
        defToString() {
            return this.def
        }

        references() {}
    }
}
