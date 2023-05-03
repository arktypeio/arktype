// @ts-ignore
import { format } from "prettier"
import { scope, type } from "../../src/main.js"

const types = scope({
    rainForest: {
        climate: "'wet'",
        color: "'green'",
        isRainForest: "true"
    },
    desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
    sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
    ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" },
    places: "rainForest|desert|sky|ocean"
}).compile()

const compiledPlaces = ($arkIn: any) => {
    switch ($arkIn.color) {
        case "green": {
            return $arkIn.climate === "wet" && $arkIn.isRainForest === true
        }
        case "brown": {
            return $arkIn.climate === "dry" && $arkIn.isDesert === true
        }
        case "blue": {
            return (() => {
                switch ($arkIn.climate) {
                    case "wet": {
                        return $arkIn.isOcean === true
                    }
                    case "dry": {
                        return $arkIn.isSky === true
                    }
                    default: {
                        return false
                    }
                }
            })()
        }
        default: {
            return false
        }
    }
}

console.log(format(types.places.root.allows.toString()))

const o = type({
    a: [
        {
            b: "number|string"
        },
        "|",
        { b: "null" }
    ]
})

console.log(o.root.getNodesAtPath("a", "b").length)
