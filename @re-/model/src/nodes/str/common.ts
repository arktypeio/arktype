// Matches groups between token excluding literals
// Try it here: https://regexr.com/6nfch
export const createSplittableMatcher = (token: "|" | "&") =>
    new RegExp(`'[^']*'|"[^"]*"|/[^/]*/|[^${token}]+`, "g")
