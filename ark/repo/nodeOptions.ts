// every supported Node (see engines.node) strips types without a flag, and the
// repo has no syntax needing transformation (enums, parameter properties), so
// only the source condition is added. --experimental-transform-types would be
// rejected in NODE_OPTIONS by Node >= 26
export const nodeDevOptions: string =
	`${process.env.NODE_OPTIONS ?? ""} --conditions ark-ts`.trimEnd()

export const addNodeDevOptions = (extraOpts?: string): string =>
	(process.env.NODE_OPTIONS = `${nodeDevOptions} ${extraOpts ?? ""}`.trimEnd())
