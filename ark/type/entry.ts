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

interface EntryGlobals {
	[loadedEntryKey]?: ArktypeEntry | "both"
}

// in standalone mode every import of arktype resolves to arktype/runtime except a runtime island's, so loading both means one didn't
export const claimEntry = (entry: ArktypeEntry): void => {
	const globals = globalThis as EntryGlobals
	const loaded = globals[loadedEntryKey]
	if (loaded === "both") return
	if (loaded !== undefined && loaded !== entry)
		throwError(writeEntryConflictMessage(entry, loaded))
	globals[loadedEntryKey] = entry
}

// each module with a runtime island calls this before it imports arktype, so arktype loaded already means another importer reached it, which the runtime then refuses
export const allowIslands = (): void => {
	const globals = globalThis as EntryGlobals
	if (globals[loadedEntryKey] !== "arktype") globals[loadedEntryKey] = "both"
}

export const writeEntryConflictMessage = <
	entry extends ArktypeEntry,
	loaded extends ArktypeEntry
>(
	entry: entry,
	loaded: loaded
): writeEntryConflictMessage<entry, loaded> =>
	`${entry} can't load beside ${loaded}, since in standalone mode every import of arktype must resolve to arktype/runtime`

export type writeEntryConflictMessage<
	entry extends ArktypeEntry,
	loaded extends ArktypeEntry
> = `${entry} can't load beside ${loaded}, since in standalone mode every import of arktype must resolve to arktype/runtime`

export const writeRuntimeVersionMismatchMessage = <
	artifactVersion extends string,
	runtimeVersion extends string
>(
	artifactVersion: artifactVersion,
	runtimeVersion: runtimeVersion
): writeRuntimeVersionMismatchMessage<artifactVersion, runtimeVersion> =>
	`an artifact built with arktype ${artifactVersion} can't run on arktype ${runtimeVersion}, so it must be rebuilt with the installed arktype`

export type writeRuntimeVersionMismatchMessage<
	artifactVersion extends string,
	runtimeVersion extends string
> = `an artifact built with arktype ${artifactVersion} can't run on arktype ${runtimeVersion}, so it must be rebuilt with the installed arktype`
