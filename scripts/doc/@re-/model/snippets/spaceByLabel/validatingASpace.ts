const data = {
    name: "Devin Aldai",
    bestFriend: {
        name: "Devin Olnyt",
        groups: [{ title: "Type Enjoyers" }]
    },
    groups: []
}

// Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
space.models.user.assert(data)
