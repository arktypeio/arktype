import { define } from "../multifile.assert"

export const getGroupDef = () =>
    define.group({
        name: "string",
        members: "user[]"
    })
