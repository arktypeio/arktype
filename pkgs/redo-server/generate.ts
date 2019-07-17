import "dotenv/config"
import "reflect-metadata"
import { generateModel } from "./src/generateModel"
import { resolvers } from "./src/resolvers"
import { authChecker } from "./src/auth"

generateModel({ resolvers, authChecker })
