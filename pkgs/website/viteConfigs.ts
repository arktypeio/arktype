import { join } from "path"
import { getWebConfig } from "@re-do/bundle"

export type GetConfigArgs = {
    watch?: boolean
}

export const getWebsiteConfig = ({ watch }: GetConfigArgs = {}) =>
    getWebConfig({
        srcDir: join(__dirname, "src"),
        outDir: join(__dirname, "dist"),
        watch
    })
