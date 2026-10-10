import {
	$ark,
	BaseScope,
	hasArkKind,
	writePrecompiledUnits,
	type BaseRoot
} from "@ark/schema"

const roots: BaseRoot[] = []

// a keyword may finalize a root it doesn't export, e.g. a generic's constraint
const { finalize } = BaseScope.prototype
BaseScope.prototype.finalize = function (node, jit) {
	if (jit !== false) roots.push(node)
	return finalize.call(this, node, jit) as never
}

const { keywords } = await import("arktype")

const resolveAll = (module: object): void => {
	for (const k in module) {
		const resolution = (module as Record<string, unknown>)[k]
		if (hasArkKind(resolution, "module")) resolveAll(resolution)
	}
}

resolveAll(keywords)

// the builtin scopes' roots, which their exports bind rather than finalize
for (const value of Object.values($ark.intrinsic))
	if (hasArkKind(value, "root")) roots.push(value)

process.stdout.write(JSON.stringify(writePrecompiledUnits(roots)))
