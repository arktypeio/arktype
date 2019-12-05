import { Photon } from "@prisma/photon"

export interface Context {
    photon: Photon
    req: any
    userId: number
}
