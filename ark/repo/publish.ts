import { shell } from "@ark/fs"
import { packages } from "./shared.js"

const tagsToPublish: string[] = []

packages.forEach(pkg => {
	const tagName = `${pkg.name}@${pkg.version}`

	const versionExists = () => {
		try {
			shell(`npm view ${tagName}`)
			return true
		} catch {
			return false
		}
	}

	if (!versionExists()) {
		shell(`git tag ${tagName}`)
		tagsToPublish.push(tagName)
		shell("pnpm publish", { cwd: pkg.path })
	}
})

shell("git push --tags")

tagsToPublish.forEach(tagName => shell(`gh release create ${tagName} --latest`))
