import { scope } from "arktype"

export default scope({
	folder: { name: "string", "folders?": "folder[]" }
}).export()
