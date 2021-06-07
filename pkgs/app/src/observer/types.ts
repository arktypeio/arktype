export const supportedEvents = {
    click: "click",
    dblclick: "click",
    submit: "click",
    change: "set",
    select: "set"
} as const

export type SupportedEvent = keyof typeof supportedEvents
