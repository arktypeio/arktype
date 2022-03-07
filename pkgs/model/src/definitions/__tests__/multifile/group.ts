import { define } from "../multifile.assert.js"

export const getGroupDef = () =>
    define.group({
        name: "string",
        members: "user[]"
    })
