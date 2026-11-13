// each set false by a build finding no validator that writes it; only
// constants, as a bundler inlines one only where no statement precedes it

/** an array's index in an issue's path */
export const reportsIndices: boolean = true

/** a key in an issue's path that isn't an identifier, like a record's */
export const bracketsKeys: boolean = true

/** text a site writes from the program's config, or a message configured or supplied as a sentence */
export const writesText: boolean = true

/** a union's issue listing its branches', written again where its path changes */
export const listsUnions: boolean = true

/** a union's issue written again where its path changes, as by a pipe or Standard Schema */
export const rewritesUnions: boolean = true

/** a union's issue added to a Traversal, where a validator isn't a checker */
export const traversesUnions: boolean = true

/** a key's site, holding its value's context */
export const readsKeySites: boolean = true

/** a checker applying a value itself, holding a morph, an alias or a callback reading its ctx */
export const appliesValues: boolean = true

/** a union a branch of which transforms data */
export const transformsBranches: boolean = true

/** such a union whose transform can fail, holding a morph or an alias */
export const failsInBranches: boolean = true

/** a union told apart by a key holding a boolean */
export const discriminatesBooleans: boolean = true

/** an errors object's `summary` */
export const readsSummary: boolean = true

/** an errors object read other than by its issues or summary: thrown, printed or passed on */
export const readsErrors: boolean = true
