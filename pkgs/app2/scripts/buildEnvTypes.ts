import { resolveConfig } from "vite"
import { writeFileSync, mkdirSync, existsSync } from "fs-extra"
import { resolve, dirname } from "path"

const MODES = ["production", "development", "test"]

const typeDefinitionFile = resolve(process.cwd(), "./types/env.d.ts")

function getBaseInterface() {
    return "interface IBaseEnv {[key: string]: string}"
}

async function getInterfaceByMode(mode: string) {
    const interfaceName = `${mode}Env`
    const { env: envForMode } = await resolveConfig({ mode }, "build")
    return {
        name: interfaceName,
        declaration: `interface ${interfaceName} extends IBaseEnv ${JSON.stringify(
            envForMode
        )}`
    }
}

async function buildMode(modes: string[], filePath: string) {
    const IBaseEnvDeclaration = getBaseInterface()

    const interfaces = await Promise.all(modes.map(getInterfaceByMode))

    const allDeclarations = interfaces.map((i) => i.declaration)
    const allNames = interfaces.map((i) => i.name)

    const ImportMetaEnvDeclaration = `type ImportMetaEnv = Readonly<${allNames.join(
        " | "
    )}>`

    const content = `
    ${IBaseEnvDeclaration}
    ${allDeclarations.join("\n")}
    ${ImportMetaEnvDeclaration}
  `

    const dir = dirname(filePath)
    if (!existsSync(dir)) {
        mkdirSync(dir)
    }

    writeFileSync(filePath, content, { encoding: "utf-8", flag: "w" })
}

buildMode(MODES, typeDefinitionFile).catch((err) => {
    console.error(err)
    process.exit(1)
})
