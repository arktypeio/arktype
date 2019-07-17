import { Prisma } from "./database"

export interface Context {
    prisma: Prisma
    req: any
    userId: string
}
