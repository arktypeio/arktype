"use strict"

/**
 * When using the PNPM package manager, you can use pnpmfile.js to workaround
 * dependencies that have mistakes in their package.json file.  (This feature is
 * functionally similar to Yarn's "resolutions".)
 *
 * For details, see the PNPM documentation:
 * https://pnpm.js.org/docs/en/hooks.html
 *
 * IMPORTANT: SINCE THIS FILE CONTAINS EXECUTABLE CODE, MODIFYING IT IS LIKELY
 * TO INVALIDATE ANY CACHED DEPENDENCY ANALYSIS.  We recommend to run "rush update --full"
 * after any modification to pnpmfile.js.
 *
 */
module.exports = {
    hooks: {
        readPackage
    }
}

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
    if (
        [
            "apollo-cache",
            "apollo-link-context",
            "@apollographql/apollo-tools",
            "apollo-graphql",
            "apollo-engine-reporting"
        ].includes(packageJson.name)
    ) {
        context.log(`Fixing dependencies for ${packageJson.name}...`)
        packageJson.peerDependencies = {
            graphql: "^0.11.0 || ^0.12.0 || ^0.13.0 || ^14.0.0"
        }
    }
    return packageJson
}
