import { removeSync, moveSync } from "fs-extra"
import { command } from "@re-do/utils/dist/command"

//rm -rf .tmp-sls-pkg
removeSync(".tmp-sls-pkg")
//unzip .serverless/redo-server.zip -d .tmp-sls-pkg
command("unzip .serverless/redo-server.zip -d .tmp-sls-pkg")
//rsync -rk node_modules/@types .tmp-sls-pkg/node_modules
command("rsync -rk node_modules/@types .tmp-sls-pkg/node_modules")
//rsync -rk node_modules/@prisma .tmp-sls-pkg/node_modules
command("rsync -rk node_modules/@prisma .tmp-sls-pkg/node_modules")
//zip -r redo-server.zip * {cwd:.tmp-sls-pkg}
command("zip -r redo-server.zip *", { cwd: ".tmp-sls-pkg" })
// mv .tmp-sls-pkg/redo-server.zip .serverless
moveSync(".tmp-sls-pkg/redo-server.zip", ".serverless/redo-server.zip", {
    overwrite: true
})
// rm -rf .tmp-sls-pkg
removeSync(".tmp-sls-pkg")
