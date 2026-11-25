// each set false by a build finding no validator that writes it; only
// constants, as a bundler inlines one only where no statement precedes it

/** an array's index in an issue's path */
export const reportsIndices: boolean = true

/** a key in an issue's path that isn't an identifier, like a record's */
export const bracketsKeys: boolean = true

/** text a site writes from the program's config, or a message configured or supplied as a sentence */
export const writesText: boolean = true

/** a site's `text`, called on its issue: text a function configured writes, or the note that its message is its code's */
export const callsSiteText: boolean = true

/** a union's issue listing its branches', written again where its path changes */
export const listsUnions: boolean = true

/** a union's issue written again where its path changes, as by a pipe or Standard Schema */
export const rewritesUnions: boolean = true

/** a union's issue added to a Traversal, where a validator isn't a checker */
export const traversesUnions: boolean = true

/** a checker applying a value itself, holding a morph, an alias or a callback reading its ctx */
export const appliesValues: boolean = true

/** a union a branch of which transforms data */
export const transformsBranches: boolean = true

/** such a union whose transform can fail, holding a morph or an alias */
export const failsInBranches: boolean = true

/** a union told apart by a key holding a boolean */
export const discriminatesBooleans: boolean = true

/** an issue whose message names its value by a label, set by `.label()` */
export const labelsValues: boolean = true

/** an errors object's `summary` */
export const readsSummary: boolean = true

/** an errors object read other than by its issues or summary: thrown, printed or passed on */
export const readsErrors: boolean = true

/** a validator holding its expression, which printing one reads: no issue's, but found by a build and written as they are */
export const holdsExpression: boolean = true

/** TraversalError named by a program, which may test what an assert threw against it: no issue's, but found by a build and written as they are */
export const namesTraversalError: boolean = true

/**
 * errors that find their issues once they're read, held by a validator whose
 * failing call may return errors nobody reads. The one a build sets true:
 * where it does, the errors classes are written to take what finds their
 * issues, and where none wrote it, as in arktype itself, their issues stay a
 * field and the runtime makes errors that wait another way
 */
export const findsOnRead: boolean = false
