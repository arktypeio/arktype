import Photon from "@generated/photon"

export interface Context {
    photon: Photon
    req: any
    id: string | null
}
