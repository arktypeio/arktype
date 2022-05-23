module.exports = {
    sidebar: [
        {
            type: "category",
            label: "Tutorial",
            items: [
                { type: "doc", label: "Start Quick ⏱️", id: "intro" },
                { type: "doc", label: "Types that Clique 🔗", id: "spaces" },
                {
                    type: "doc",
                    label: "Definitions that Split ✂️",
                    id: "declarations"
                },
                {
                    type: "doc",
                    label: "Validation that Fits 🧩",
                    id: "constraints"
                }
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
