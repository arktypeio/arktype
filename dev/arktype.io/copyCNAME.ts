// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("node:fs")

fs.cpSync("./CNAME", "./dist/CNAME")
