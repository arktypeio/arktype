export const formatEmail = (email: string | undefined) =>
    email ? email.trim().toLowerCase() : ""
