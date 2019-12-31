export const getMode = () =>
    process.env.NODE_ENV === "development" ? "development" : "production"
export const isDev = () => getMode() === "development"
export const isProd = () => getMode() === "production"
