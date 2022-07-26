export const demoGen = () => {
    return `import {user, error, fetchUser} from "./model"
import {populateDemo} from "./populateDemo"
populateDemo()
    `
}

// Record<filename, {}}>
const demoAdapters = {
    model: "{data: fetchUser(), error, definition: user.definition}"
}
