import { attest, contextualize } from "@ark/attest"
import { keywords, type } from "arktype"

const validUuidV4 = "f70b8242-dd57-4e6b-b0b7-649d997140a0"

const validUuidV5 = "f70b8242-dd57-5e6b-b0b7-649d997140a0"

contextualize(() => {
	it("root", () => {
		const Uuid = type("string.uuid")
		attest(Uuid(validUuidV4)).equals(validUuidV4)
		attest(Uuid("1234").toString()).snap('must be a UUID (was "1234")')
	})

	it("version subtype", () => {
		const Uuidv4 = type("string.uuid.v4")

		attest(Uuidv4(validUuidV4)).equals(validUuidV4)
		attest(Uuidv4("1234").toString()).snap('must be a UUIDv4 (was "1234")')

		attest(keywords.string.uuid.v5(validUuidV5)).equals(validUuidV5)

		attest(Uuidv4(validUuidV5).toString()).equals(
			'must be a UUIDv4 (was "f70b8242-dd57-5e6b-b0b7-649d997140a0")'
		)
	})
})
