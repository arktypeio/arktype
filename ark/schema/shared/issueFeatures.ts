// what a program's issues may hold, each set false by a build finding no
// validator of the program that writes it, so its bundler drops what reads it.
// Only constants, as a bundler inlines one only where no statement precedes it

/** an array's index in an issue's path */
export const reportsIndices: boolean = true

/** a key in an issue's path that isn't an identifier, like a record's */
export const bracketsKeys: boolean = true

/** text a site writes from the program's config, like a problem */
export const writesText: boolean = true

/** a key's site, holding its value's context */
export const readsKeySites: boolean = true

/** errors arktype's own runtime writes, whose summary a TraversalError reads */
export const runsArktype: boolean = true
