// @ts-nocheck
// regex(...) from arkregex: the first string argument is the pattern.
import { regex } from "arkregex"

const Email = regex("^[a-z]+@[a-z]+\\.com$")
const Flags = regex("^\\d{3}-\\d{4}$", "g")
const Escapes = regex("a\\\\b\\\"c\\'d")
const Single = regex('^(?<year>\\d{4})-(?<month>\\d{2})$')
const Template = regex(`^[A-Z]{2}\d+$`, "iu")
const Groups = regex("(foo|bar)+?[^0-9]*", flags)
const Empty = regex("")
const WordChars = regex("^[a-z_]+é$")
const Unicode = regex("\\p{L}+", "u")
const QuotesInside = regex("^'[a-z]'|\"x\"$")
const Concatenated = regex("ab" + "cd")

// near misses
myregex("^a$")
regexp("^a$")
new RegExp("^a$")
const literal = /^[a-z]+$/

// last, since TextMate never closes the member call it starts
const Member = ark.regex("^x$")
