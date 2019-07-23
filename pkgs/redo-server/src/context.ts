import Photon from "@generated/photon"

export interface Context {
    prisma: Photon
    req: any
    userId: string
}
