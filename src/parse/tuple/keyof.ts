import type { PrefixParser } from "./tuple"

// TODOSHAWN: add "keyof" as a prefix token

// Should accept a def, parse it, then return the "keys" of that def according
// to the same logic as TypeScript. Some cases to consider:

// If the type is a union, either of multiple domains or within a single domain,
// the only keys that get returned are the keys that are present on every branch
// of the union

// First, check if the node (i.e. parse result) has any domains other than
// object. If so, return never. Otherwise, iterate over all object branches,
// maintaining a keySet of the required+optional props that have existed on
// every branch. Once you get to the last branch, return a new node representing
// a string union of the remaining keys.
export const parseKeyOfTuple: PrefixParser<any> = (def, $) => ({})
