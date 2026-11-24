// @ts-nocheck
// TextMate's injection applies inside any string, so an entrypoint call
// written in a string is highlighted. Each case is last on its line, since
// what follows the call's `)` in the string reopens a string TextMate never
// closes.
const doubleQuoted = "type('string | number')"
