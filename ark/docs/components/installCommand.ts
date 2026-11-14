export const installers = ["pnpm", "npm", "yarn", "bun"] as const

export type Installer = (typeof installers)[number]

export type InstallOptions = {
	/** @default "arktype" */
	pkg?: string | undefined
	dev?: boolean | undefined
}

export const installCommand = (
	installer: Installer,
	{ pkg = "arktype", dev }: InstallOptions
): string =>
	`${installer} ${installer === "yarn" || installer === "bun" ? "add" : "install"}${dev ? " -D" : ""} ${pkg}`
