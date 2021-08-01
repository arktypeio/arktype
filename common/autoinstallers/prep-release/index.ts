import { shell, dirName } from "@re-do/node-utils"

const rushPrefix = "node common/scripts/install-run-rush.js"
const rushBuildSteps = ["change -v", "install --no-link", "link", "build"]

rushBuildSteps.forEach((step) => shell(`${rushPrefix} ${step}`))

shell("npx playwright install-deps")
shell(`${rushPrefix} test`)
shell("npm run release", { cwd: dirName("pkgs", "app") })
