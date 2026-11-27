import { attest, contextualize } from "@ark/attest"
import { readPackageJson } from "@ark/fs"
import { arkUtilVersion, nameOf, register, registry } from "@ark/util"

contextualize(() => {
	it("version matches package.json", () => {
		const { version } = readPackageJson()
		attest(arkUtilVersion).equals(version)
	})

	it("registered names never collide", () => {
		const anonymous = [() => {}][0]
		const name = register(anonymous)
		const named = { [name]: () => {} }[name]
		const version = () => {}

		attest(registry[register(named)]).equals(named)
		attest(registry[name]).equals(anonymous)
		attest(registry[register(version)]).equals(version)
		attest(registry.version).equals(arkUtilVersion)
	})

	it("names a symbol Symbol.for registered, which nothing holds weakly", () => {
		const registered = Symbol.for("registeredFor")
		const name = nameOf(registered)
		attest(name).snap("registeredFor")
		attest(nameOf(registered)).equals(name)
		attest(register(registered)).equals(name)
	})

	it("counted names never collide", () => {
		const names = ["counted", "counted", "counted$1", "counted$1$1"].map(name =>
			nameOf({ [name]: () => {} }[name])
		)
		attest(names).equals([
			"counted",
			"counted$1",
			"counted$1$1",
			"counted$1$1$1"
		])
	})
})
