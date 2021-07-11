declare module "*.md" {
    const url: string
    export default url
}

declare module "*.md?raw" {
    const content: string
    export default content
}
