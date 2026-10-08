import { noSuggest, throwError } from "@ark/util"

export type ArktypeEntry = "arktype" | "arktype/runtime"

// a test pins this to package.json's version
export const arktypeVersion = "2.2.8"

// arktype pins its dependencies, so its version identifies everything compiled code calls
export const assertRuntimeVersion = (version: string): void => {
	if (version !== arktypeVersion)
		throwError(writeRuntimeVersionMismatchMessage(version, arktypeVersion))
}

const loadedEntryKey = noSuggest("loadedArktypeEntry")

// in standalone mode every import of arktype resolves to arktype/runtime, so loading both means one didn't
export const claimEntry = (entry: ArktypeEntry): void => {
	const entries = globalThis as { [loadedEntryKey]?: ArktypeEntry }
	const loaded = entries[loadedEntryKey]
	if (loaded !== undefined && loaded !== entry)
		throwError(writeEntryConflictMessage(entry, loaded))
	entries[loadedEntryKey] = entry
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

export const writeRuntimeVersionMismatchMessage = <
	artifactVersion extends string,
	runtimeVersion extends string
>(
	artifactVersion: artifactVersion,
	runtimeVersion: runtimeVersion
): writeRuntimeVersionMismatchMessage<artifactVersion, runtimeVersion> =>
	`This artifact was built with arktype ${artifactVersion}, but ${runtimeVersion} is installed. Rebuild it with the installed arktype.`

export type writeRuntimeVersionMismatchMessage<
	artifactVersion extends string,
	runtimeVersion extends string
> = `This artifact was built with arktype ${artifactVersion}, but ${runtimeVersion} is installed. Rebuild it with the installed arktype.`
