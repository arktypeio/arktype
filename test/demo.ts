import { scope } from "arktype"

const types = scope({
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

const { data, problems } = types.package({
    name: "arktype",
    version: "1.0.0-alpha",
    dependencies: [{ name: "left-pad", version: "5.0.0-beta", dependencies: [] }]
})
console.log(problems?.summary ?? data?.dependencies[0].dependencies)
