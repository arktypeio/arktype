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
    return packageJson
}
