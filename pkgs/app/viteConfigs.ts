import { join } from "path"
import { getNodeConfig, getWebConfig } from "@re-do/configs"

const pkgRoot = join(__dirname, "src")
const outRoot = join(__dirname, "dist")

const localResolves = [
    { find: "main", replacement: join(pkgRoot, "main") },
    {
        find: "renderer",
        replacement: join(pkgRoot, "renderer")
    },
    {
        find: "observer",
        replacement: join(pkgRoot, "observer")
    },
    { find: "common", replacement: join(pkgRoot, "common") },
    {
        find: "assets",
        replacement: join(pkgRoot, "assets")
    }
]

export type GetConfigArgs = {
    watch?: boolean
}

export const getMainConfig = ({ watch }: GetConfigArgs = {}) =>
    getNodeConfig({
        srcDir: join(pkgRoot, "main"),
        outDir: join(outRoot, "main"),
        watch,
        options: {
            resolve: {
                alias: localResolves
            }
        }
    })

export const getRendererConfig = ({ watch }: GetConfigArgs = {}) =>
    getWebConfig({
        srcDir: join(pkgRoot, "renderer"),
        outDir: join(outRoot, "renderer"),
        watch,
        options: {
            base: "./",
            resolve: {
                alias: localResolves
            }
        }
    })

export const getObserverConfig = ({ watch }: GetConfigArgs = {}) =>
    getNodeConfig({
        srcDir: join(pkgRoot, "observer"),
        outDir: join(outRoot, "observer"),
        watch,
        options: {
            build: {
                target: "chrome89"
            },
            resolve: {
                alias: localResolves
            }
        }
    })
