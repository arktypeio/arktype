import { scope } from "arktype"

export const types = scope({
    package: {
        name: "string",
        version: "semver",
        dependencies: [
            "package[]",
            "=>",
            (pkgs, problems) =>
                pkgs.every(({ name }) => name !== "left-pad") ||
                !problems.mustBe("not breaking the internet")
        ]
    }
}).compile()

export const arktypeRelease = {
    name: "arktype",
    version: "1.0.0-alpha",
    dependencies: []
} as const
