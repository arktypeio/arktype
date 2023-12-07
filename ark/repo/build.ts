// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { shell } from "../fs/main.js"

shell("pnpm tsc --project tsconfig.build.json")
