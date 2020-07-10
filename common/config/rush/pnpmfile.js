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
        packageJson.name.startsWith("apollo-") &&
        (!packageJson.peerDependencies || !packageJson.peerDependencies.graphql)
    ) {
        context.log(
            `Adding GraphQL as a peer dependency for ${packageJson.name}...`
        )
        packageJson.peerDependencies = {
            graphql: "^0.11.0 || ^0.12.0 || ^0.13.0 || ^14.0.0"
        }
    }
    if (packageJson.name === "material-table") {
        context.log(
            "Adding @babel/runtime as a dependency for material-table..."
        )
        packageJson.dependencies["@babel/runtime"] = "7.5.5"
    }
    if (packageJson.name.startsWith("@graphql-codegen/")) {
        context.log(
            `Adding change-case as a peer dependency for ${packageJson.name}...`
        )
        packageJson.dependencies["change-case"] = "4.1.1"
        packageJson.dependencies["@graphql-toolkit/common"] = "0.7.4"
        packageJson.dependencies["auto-bind"] = "4.0.0"
    }
    if (packageJson.name === "@prisma/engine-core") {
        context.log("Updating undici version for @prisma/engine-core...")
        packageJson.dependencies["undici"] = "1.0.3"
    }
    if (packageJson.name.startsWith("@docusaurus")) {
        if (!packageJson.dependencies["core-js"]) {
            context.log(
                `Adding core-js as a dependency for ${packageJson.name}...`
            )
            packageJson.dependencies["core-js"] = "^2.6.5"
        }
    }
    return packageJson
}
