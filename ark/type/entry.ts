import { throwError } from "@ark/util"

export type ArktypeEntry = "arktype" | "arktype/runtime"

const loadedEntryKey = Symbol.for("arktype.entry")

// in standalone mode every import of arktype resolves to arktype/runtime, so loading both means one didn't
export const claimEntry = (entry: ArktypeEntry): void => {
	const global = globalThis as Record<symbol, ArktypeEntry | undefined>
	const loaded = global[loadedEntryKey]
	if (loaded !== undefined && loaded !== entry)
		throwError(writeEntryConflictMessage(entry, loaded))
	global[loadedEntryKey] = entry
}

export const writeEntryConflictMessage = <
	entry extends ArktypeEntry,
	loaded extends ArktypeEntry
>(
	entry: entry,
	loaded: loaded
): writeEntryConflictMessage<entry, loaded> =>
	`${entry} can't load beside ${loaded}. In standalone mode, every import of arktype must resolve to arktype/runtime.`

export type writeEntryConflictMessage<
	entry extends ArktypeEntry,
	loaded extends ArktypeEntry
> = `${entry} can't load beside ${loaded}. In standalone mode, every import of arktype must resolve to arktype/runtime.`
