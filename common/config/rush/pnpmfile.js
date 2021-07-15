"use strict"

module.exports = {
    hooks: {
        readPackage
    }
}

function readPackage(packageJson, context) {
    if (packageJson.name === "dmg-builder") {
        context.log(
            "Adding 'dmg-license' as a non-optional dependency of 'dmg-builder'..."
        )
        packageJson.dependencies["dmg-license"] = "1.0.9"
    }
    if (packageJson.name === "electron-builder") {
        context.log(
            "Adding 'dmg-license' as a non-optional dependency of 'electron-builder'..."
        )
        packageJson.dependencies["dmg-license"] = "1.0.9"
    }
    if (packageJson.name === "vite-plugin-mdx") {
        context.log(
            "Adding '@mdx-js/react' as a dependency of 'vite-plugin-mdx'..."
        )
        packageJson.dependencies["@mdx-js/react"] = "1.6.22"
    }
    return packageJson
}
