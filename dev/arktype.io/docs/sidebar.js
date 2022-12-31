module.exports = {
    sidebar: [
        {
            type: "category",
            label: "Tutorial",
            items: [
                { type: "doc", label: "Intro", id: "intro" },
                { type: "doc", label: "Scopes", id: "scopes" },
                {
                    type: "doc",
                    label: "Constraints",
                    id: "constraints"
                }
            ]
        },
        {
            type: "category",
            label: "API",
            items: [
                { type: "doc", label: "Type", id: "api/type" },
                { type: "doc", label: "Scope", id: "api/scope" },
                { type: "doc", label: "Node", id: "api/TypeNode" }
            ]
        },
        {
            type: "category",
            label: "Examples",
            items: [
                { type: "doc", label: "Useage", id: "examples/type" },
                { type: "doc", label: "Errors", id: "examples/error" },
                { type: "doc", label: "Advanced", id: "examples/advanced" }
            ]
        }
    ]
}
