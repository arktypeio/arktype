import { PrismaClient } from "@prisma/client"

export interface Context {
    prisma: PrismaClient
    req: any
    userId: number
}
