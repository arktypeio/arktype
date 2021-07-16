declare module "*.svg" {
    const content: string
    export default content
}

declare module "*.png" {
    const content: string
    export default content
}

declare module "*?url" {
    const url: string
    export default url
}
