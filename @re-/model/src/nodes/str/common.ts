import { Common } from "../common.js"

// Matches groups between token excluding literals
// Try it here: https://regexr.com/6nua3
export const createSplittableMatcher = (token: "|" | "&" | "|&") =>
    // Note: Also matches consecutive instances of token e.g. in "string||number"
    // so we can detect syntax errors which would otherwise just be ignored.
    new RegExp(`'[^']*'|"[^"]*"|/[^/]*/|[^${token}]+|[${token}]{2,}`, "g")

export abstract class StrLeaf<
    DefType extends string
> extends Common.Leaf<DefType> {
    defToString() {
        return this.def
    }
}

export abstract class StrBranch<
    DefType extends string,
    Next = Common.Parser.Node
> extends Common.Branch<DefType, Next> {
    defToString() {
        return this.def
    }

    references() {}
}
