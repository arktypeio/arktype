import { type } from "arktype"

const forms = [type({ name: "string" }), type({ role: "string" })]

export const nullables = forms.map(form => form.or("null"))
