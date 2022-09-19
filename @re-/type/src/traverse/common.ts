export type Segment = string | number
export type Path = Segment[]

export const pathToString = (path: Path) =>
    path.length === 0
        ? "/"
        : path.length === 1 && typeof path[0] === "number"
        ? `Item ${path[0]}`
        : path.join("/")
