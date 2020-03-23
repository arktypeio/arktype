import { join } from "path"
import { removeSync, moveSync, copySync } from "fs-extra"
import { shell } from "@re-do/utils/dist/node"

removeSync(".tmp-sls-pkg")
shell("unzip .serverless/redo-server.zip -d .tmp-sls-pkg")
shell("rsync -rk node_modules/@types .tmp-sls-pkg/node_modules")
shell("rsync -rk node_modules/@prisma .tmp-sls-pkg/node_modules")
copySync(
    join(__dirname, "schema.gql"),
    join(__dirname, ".tmp-sls-pkg", "schema.gql")
)
shell("zip -r redo-server.zip *", { cwd: ".tmp-sls-pkg" })
moveSync(".tmp-sls-pkg/redo-server.zip", ".serverless/redo-server.zip", {
    overwrite: true,
})
removeSync(".tmp-sls-pkg")
