module.exports = {
    sidebar: [
        {
            type: "category",
            label: "Quick Start",
            items: [
                { type: "doc", label: "Models", id: "intro" },
                { type: "doc", label: "Spaces", id: "spaces" },
                { type: "doc", label: "Declarations", id: "declarations" },
                { type: "doc", label: "Constraints", id: "constraints" }
            ]
        },
        {
            type: "category",
            label: "API",
            items: [
                { type: "doc", label: "create", id: "api/model.create" },
                { type: "doc", label: "compile", id: "api/model.compile" },
                { type: "doc", label: "declare", id: "api/model.declare" }
            ]
        }
    ]
}
