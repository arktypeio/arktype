import { attest, contextualize } from "@ark/attest"
import { readPackageJson } from "@ark/fs"
import { arkUtilVersion, register, registry } from "@ark/util"

contextualize(() => {
	it("version matches package.json", () => {
		const { version } = readPackageJson()
		attest(arkUtilVersion).equals(version)
	})

	it("gives a value a name no registry key or other value has", () => {
		const anonymous = [() => {}][0]
		const name = register(anonymous)
		const named = { [name]: () => {} }[name]
		const version = () => {}

		attest(registry[register(named)]).equals(named)
		attest(registry[name]).equals(anonymous)
		attest(registry[register(version)]).equals(version)
		attest(registry.version).equals(arkUtilVersion)
	})
})
