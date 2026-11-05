// each set false by a build finding no validator that writes it; only
// constants, as a bundler inlines one only where no statement precedes it

/** an array's index in an issue's path */
export const reportsIndices: boolean = true

/** a key in an issue's path that isn't an identifier, like a record's */
export const bracketsKeys: boolean = true

/** text a site writes from the program's config, like a problem */
export const writesText: boolean = true

/** a union's issue listing its branches', written again where its path changes */
export const listsUnions: boolean = true

/** a union's issue added to a Traversal, where a validator isn't a checker */
export const traversesUnions: boolean = true

/** a key's site, holding its value's context */
export const readsKeySites: boolean = true

/** errors arktype's own runtime writes, whose summary a TraversalError reads */
export const runsArktype: boolean = true

/** an errors object's `summary` */
export const readsSummary: boolean = true

/** an errors object read other than by its issues or summary: thrown, printed or passed on */
export const readsErrors: boolean = true
