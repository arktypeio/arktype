// Matches groups between token excluding literals
// Try it here: https://regexr.com/6nua3
export const createSplittableMatcher = (token: "|" | "&") =>
    // Note: Also matches consecutive instances of token e.g. in "string||number"
    // so we can detect syntax errors which would otherwise just be ignored.
    new RegExp(`'[^']*'|"[^"]*"|/[^/]*/|[^${token}]+|[${token}][${token}]`, "g")
