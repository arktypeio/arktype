import { attest, contextualize } from "@ark/attest"
import { scope, type, type Locale } from "arktype"
import { keywordPhrases } from "arktype/internal/keywords/phrases.ts"
import { de } from "arktype/locales/de"
import { en } from "arktype/locales/en"
import { matrixOf } from "./matrix.ts"
import { withConfig } from "./withConfig.ts"

// lib targets ES2020, before ListFormat
const { ListFormat } = Intl as {} as {
	ListFormat: new (
		tag: string,
		options: { type: "conjunction" | "disjunction" }
	) => { format: (items: readonly string[]) => string }
}

contextualize(() => {
	it("is complete", () => {
		attest(Object.keys(de.keywordPhrases)).equals(
			Object.keys(en.keywordPhrases)
		)
		attest(Object.keys(de.nouns).sort()).equals(Object.keys(en.nouns).sort())
		attest(
			(): Locale.Complete => ({
				...de,
				// @ts-expect-error
				keywordPhrases: {}
			})
		).type.errors("is missing")
	})

	it("renders every code and variant", () => {
		attest(matrixOf(de)).snap({
			'string > 0 ← ""': "darf nicht leer sein",
			'string <= 0 ← "x"': "muss leer sein",
			'string == 0 ← "x"': "muss leer sein",
			"unknown[] <= 0 ← [0]": "muss leer sein",
			"unknown[] == 0 ← [0]": "muss leer sein",
			"number >= 0 ← -1": "darf nicht negativ sein",
			"number > 0 ← 0": "muss positiv sein",
			"number <= 0 ← 1": "darf nicht positiv sein",
			"number < 0 ← 0": "muss negativ sein",
			'string >= 1 ← ""': "darf nicht leer sein",
			"unknown[] >= 1 ← []": "darf nicht leer sein",
			"number % 1 ← 2.5": "muss eine ganze Zahl sein",
			'string > 1 ← "x"': "muss mindestens 2 Zeichen lang sein",
			'string <= 1 ← "xx"': "muss höchstens 1 Zeichen lang sein",
			'string == 1 ← "xx"': "muss genau 1 Zeichen lang sein",
			"unknown[] <= 1 ← [0,1]": "muss höchstens 1 Element enthalten",
			"unknown[] == 1 ← [0,1]": "muss genau 1 Element enthalten",
			"number >= 1 ← 0": "muss mindestens 1 sein",
			"number > 1 ← 1": "muss größer als 1 sein",
			"number <= 1 ← 2": "muss höchstens 1 sein",
			"number < 1 ← 1": "muss kleiner als 1 sein",
			'string >= 2 ← "x"': "muss mindestens 2 Zeichen lang sein",
			"unknown[] >= 2 ← [0]": "muss mindestens 2 Elemente enthalten",
			"number % 2 ← 3.5": "muss gerade sein",
			'string > 2 ← "xx"': "muss mindestens 3 Zeichen lang sein",
			'string <= 2 ← "xxx"': "muss höchstens 2 Zeichen lang sein",
			'string == 2 ← "xxx"': "muss genau 2 Zeichen lang sein",
			"unknown[] <= 2 ← [0,1,2]": "muss höchstens 2 Elemente enthalten",
			"unknown[] == 2 ← [0,1,2]": "muss genau 2 Elemente enthalten",
			"number % 5 ← 6.5": "muss ein Vielfaches von 5 sein",
			"number >= 1.5 ← 1.25": "muss mindestens 1,5 sein",
			"number < -1.5 ← -1.5": "muss kleiner als -1,5 sein",
			"number != 0 ← 0": "muss ungleich 0 sein",
			"number != 1.5 ← 1.5": "muss ungleich 1,5 sein",
			'string != 2 ← "xx"': "darf nicht 2 Zeichen lang sein",
			"unknown[] != 2 ← [0,1]": "darf nicht 2 Elemente enthalten",
			"unknown[] == 1 ← []": "muss genau 1 Element enthalten",
			"unknown[] >= 2 ← []": "muss mindestens 2 Elemente enthalten",
			"Date < 2000 ← 2001-01-01T00:00:00.000Z":
				"muss spätestens der 31. Dezember 1999, 23:59:59,999 UTC sein",
			"Date <= 2000 ← 2001-05-03T00:00:00.000Z":
				"muss spätestens der 1. Januar 2000 sein",
			"Date >= May 3 ← 2000-05-02T23:00:00.000Z":
				"muss frühestens der 3. Mai 2000 sein",
			"Date > May 3, 12:30 ← 1999-01-01T00:00:00.000Z":
				"muss frühestens der 3. Mai 2000, 12:30:00,001 UTC sein",
			"Date <= May 3, 12:30:05.123 ← 2000-12-31T09:05:00.000Z":
				"muss spätestens der 3. Mai 2000, 12:30:05,123 UTC sein",
			"Date != May 3 ← 2000-05-03T00:00:00.000Z":
				"muss ungleich dem 3. Mai 2000 sein",
			"May 3 ← 2000-05-04T00:00:00.000Z":
				"muss ein Wert gemäß der Beschreibung „2000-05-03“ sein",
			"enumerated Dates ← 2000-05-05T00:00:00.000Z":
				"muss der 3. Mai 2000 or der 4. Mai 2000 sein",
			"narrowed Date ← 2000-05-03T00:00:00.000Z":
				"muss gemäß einem anonymen Prädikat gültig sein",
			"string ← 5": "muss eine Zeichenkette sein",
			'number ← "x"': "muss eine Zahl sein",
			"number ← NaN": "muss eine Zahl sein",
			"number ← Infinity": "muss eine Zahl sein",
			"bigint ← 1": "muss ein BigInt sein",
			"symbol ← 1": "muss ein Symbol sein",
			"object ← 1": "muss ein Objekt sein",
			"boolean ← 1": "muss ein Wahrheitswert sein",
			"null ← 1": "muss null sein",
			"undefined ← null": "muss undefined sein",
			"'a' ← \"b\"": 'muss "a" sein',
			"5 ← 4": "muss 5 sein",
			"1.5 ← 2.5": "muss 1,5 sein",
			"5n ← 4n": "muss 5n sein",
			"true ← false": "muss true sein",
			"unit object ← {}": "muss {} sein",
			"unit symbol ← 1": "muss Symbol(s) sein",
			"Date ← 1": "muss ein Date-Objekt sein",
			"Date ← Invalid Date": "muss ein Date-Objekt sein",
			"Date ← Object.create(Date.prototype)": "muss ein Date-Objekt sein",
			"Array ← {}": "muss ein Array sein",
			"Map ← []": "muss eine Map sein",
			"Set ← Map": "muss ein Set sein",
			'RegExp ← "a"': "muss ein RegExp-Objekt sein",
			"Error ← {}": "muss ein Error-Objekt sein",
			"Promise ← 1": "muss ein Promise sein",
			"Uint8Array ← []": "muss ein Uint8Array sein",
			"instanceOf ← 1970-01-01T00:00:00.000Z": "muss eine Instanz von Foo sein",
			'/^a.*$/ ← "b"': "muss dem Muster ^a.*$ entsprechen",
			'/a/i ← "b"': "muss dem Muster a entsprechen",
			"narrow named ← 3": "muss gemäß isEven gültig sein",
			"narrow anonymous ← 1": "muss gemäß einem anonymen Prädikat gültig sein",
			"narrow mustBe ← -1":
				"muss ein Wert gemäß der Beschreibung „positiv“ sein",
			'pipe.try anonymous ← "{"':
				"konnte nicht verarbeitet werden:\n    Error: kaputt",
			'pipe.try named ← "{"':
				"konnte von parse nicht verarbeitet werden:\n    Error: kaputt",
			"required string ← {}": "a fehlt (muss eine Zeichenkette sein)",
			"required boolean ← {}": "a fehlt (muss ein Wahrheitswert sein)",
			"required never ← {}": "a fehlt (muss never sein)",
			"required unknown ← {}": "a fehlt",
			"required unknown | string ← {}":
				"a fehlt (muss eine Zeichenkette oder ein beliebiger Wert sein)",
			"required string | number | Date ← {}":
				"a fehlt (muss eine Zahl, eine Zeichenkette oder ein Date-Objekt sein)",
			"required units ← {}": 'a fehlt (muss 1n; "x"; "y" oder 1,5 sein)',
			"required described unit ← {}":
				"a fehlt (muss ein Wert gemäß der Beschreibung „ein x“ sein)",
			"required instanceOf ← {}": "a fehlt (muss eine Instanz von Foo sein)",
			"required string.uuid | number ← {}":
				"a fehlt (muss eine Zahl oder eine Zeichenkette sein)",
			"required string.email | string.uuid ← {}":
				"a fehlt (muss eine Zeichenkette sein)",
			"required string.date.epoch.parse ← {}":
				"a fehlt (muss ein gültiger Unix-Zeitstempel als ganzzahlige Zeichenkette sein)",
			"required number.epoch ← {}": "a fehlt (muss eine Zahl sein)",
			'required, two at one path ← {"b":""}':
				"a fehlt (muss eine Zahl oder eine Zeichenkette sein)",
			"required in a union ← {}":
				"a fehlt (muss never sein) oder b fehlt (muss ein Wahrheitswert sein)",
			"required union in a union ← {}": "a fehlt (muss 1, 2 oder 3 sein)",
			'undeclared ← {"a":"","b":1}': "b ist nicht erlaubt",
			'undeclared in a union ← {"a":"","b":"y"}':
				"b muss eine Zahl oder entfernt sein",
			'discriminant ← {"kind":"triangle"}':
				'kind muss "circle" oder "square" sein',
			"discriminant absent ← {}":
				'kind fehlt (muss "circle" oder "square" sein)',
			'discriminant described ← {"kind":"triangle"}':
				"muss ein Wert gemäß der Beschreibung „eine Form“ sein",
			"discriminant described branches ← true":
				"muss ein Wert gemäß der Beschreibung „eine Anzahl“ or eine Zeichenkette sein",
			'discriminant numbers ← {"k":3.5}': "k muss 1,5 oder 2,5 sein",
			'discriminant bigints ← {"k":"3n"}': "k muss 1n oder 2n sein",
			'discriminant units ← "d"': 'muss "a", "b" oder "c" sein',
			"discriminant domains ← true":
				"muss ein BigInt, eine Zahl, eine Zeichenkette oder ein Objekt sein",
			'discriminant in an outer union ← {"a":{"kind":"triangle"}}':
				'a muss eine Zeichenkette sein oder a.kind muss "circle" oder "square" sein',
			"discriminant unreadable ← 5": "muss ein Objekt sein",
			'discriminant beside a default ← {"id":5}':
				"id muss 0 oder 1 sein oder name fehlt (muss eine Zeichenkette sein)",
			'discriminant cases beside a default ← "d"':
				'muss "a", "b", "c" oder mindestens 6 Zeichen lang sein',
			"union of paths ← {}":
				"a fehlt (muss eine Zeichenkette sein) oder b fehlt (muss eine Zahl sein)",
			"union described ← {}":
				"muss ein Wert gemäß der Beschreibung „ein a oder b“ sein",
			"union boolean | null ← 1": "muss false, null oder true sein",
			'union of lengths ← "a"': "muss leer oder mindestens 3 Zeichen lang sein",
			"union of array lengths ← [0]":
				"muss ein leeres Array oder ein Array mit mindestens 3 Elementen sein",
			"union of signs ← -1": "muss kleiner als -10 oder mindestens 0 sein",
			"union of decimals ← 4": "muss 1,5; 2,5 oder 3,5 sein",
			'union with an authored branch ← "a"':
				"muss eine E-Mail-Adresse oder ein Wert gemäß der Beschreibung „ein Benutzername“ sein",
			'union with a narrow ← "ab"':
				"muss mindestens 5 Zeichen lang oder gemäß isUpper gültig sein",
			"union at an index ← [true]":
				"Wert an [0] muss eine Zahl oder eine Zeichenkette sein",
			"never ← 5": "muss never sein",
			'never at a path ← {"a":1}': "a muss never sein",
			"intersection ← 3": "muss gerade sein\nmuss größer als 10 sein",
			"intersection with an authored constraint ← 3":
				"muss gerade sein\nmuss ein Wert gemäß der Beschreibung „zweistellig“ sein",
			'path ← {"user":{"address":{"zip":5}}}':
				"user.address.zip muss eine Zeichenkette sein",
			'path at an index ← ["a",1]': "Wert an [1] muss eine Zeichenkette sein",
			'path through an index ← {"a":[1]}': "a[0] muss eine Zeichenkette sein",
			'path of a quoted key ← {"a b":1}':
				'Wert an ["a b"] muss eine Zeichenkette sein',
			"titled at the root ← 5": "muss eine Zeichenkette sein",
			'titled ← {"name":5}': "„Name“ muss eine Zeichenkette sein",
			'titled length ← {"name":"a"}':
				"„Name“ muss mindestens 3 Zeichen lang sein",
			"titled required ← {}": "„Name“ fehlt (muss eine Zeichenkette sein)",
			'titled at an index ← ["a",1]':
				"„Name“ an [1] muss eine Zeichenkette sein",
			'titled through an index ← {"list":[1]}':
				"„Name“ an list[0] muss eine Zeichenkette sein",
			'titled, two constraints ← {"n":3}':
				"„Anzahl“ muss gerade sein\n„Anzahl“ muss größer als 10 sein",
			"titled, two constraints at an index ← [3]":
				"„Anzahl“ an [0] muss gerade sein\n„Anzahl“ an [0] muss größer als 10 sein",
			'titled enum ← {"s":"c"}': '„Name“ muss "a" oder "b" sein',
			'titled discriminated enum ← {"s":"d"}':
				'„Name“ muss "a", "b" oder "c" sein',
			'titled domains ← {"v":true}':
				"„Name“ muss eine Zahl oder eine Zeichenkette sein",
			"titled union of paths ← {}":
				"„Name“ fehlt (muss eine Zeichenkette sein) oder „Alter“ fehlt (muss eine Zahl sein)",
			"described ← 5":
				"muss ein Wert gemäß der Beschreibung „ein Benutzername“ sein",
			"configured expected ← 5":
				"muss ein Wert gemäß der Beschreibung „ein Name“ sein",
			'described length ← "a"':
				"muss ein Wert gemäß der Beschreibung „ein Benutzername“ sein",
			"described array length ← [0]":
				"muss ein Wert gemäß der Beschreibung „ein Paar“ sein",
			'actual suppressed ← "ez"': "muss mindestens 8 Zeichen lang sein",
			'configured actual of an empty value ← ""':
				"darf nicht leer sein, ist aber zu kurz",
			"actual suppressed array ← [0]": "muss mindestens 2 Elemente enthalten",
			"configured writer reading the description ← 3":
				"muss more than 5 (!) sein",
			'number.epoch ← "x"': "muss ein Unix-Zeitstempel als Zahl sein",
			"object.json ← Map": "muss ein einfaches Objekt oder Array sein",
			'string.alpha ← " x"': "muss rein alphabetisch sein",
			'string.alphanumeric ← " x"': "muss rein alphanumerisch sein",
			'string.base58 ← " x"': "muss Base58-kodiert sein",
			'string.base64 ← "x"': "muss Base64-kodiert sein",
			'string.base64.url ← "x"': "muss Base64url-kodiert sein",
			'string.capitalize.preformatted ← "x"': "muss großgeschrieben sein",
			'string.creditCard ← "x"': "muss eine Kreditkartennummer sein",
			'string.date ← "x"': "muss ein parsbares Datum sein",
			'string.date.iso ← "x"':
				"muss ein Datum oder Zeitpunkt nach ISO 8601 sein",
			'string.date.parse ← "x"': "muss ein parsbares Datum sein",
			'string.digits ← "x"': "muss eine Ziffernfolge (0-9) sein",
			'string.email ← "x"': "muss eine E-Mail-Adresse sein",
			'string.hex ← "x"': "muss rein hexadezimal sein",
			'string.integer ← "x"':
				"muss eine wohlgeformte ganzzahlige Zeichenkette sein",
			'string.integer.parse ← "9007199254740993"':
				"muss eine ganze Zahl im Bereich Number.MIN_SAFE_INTEGER bis Number.MAX_SAFE_INTEGER sein",
			'string.ip ← "x"': "muss eine IP-Adresse sein",
			'string.ip.v4 ← "x"': "muss eine IPv4-Adresse sein",
			'string.ip.v6 ← "x"': "muss eine IPv6-Adresse sein",
			'string.json ← "x"': "muss eine JSON-Zeichenkette sein (⟨SyntaxError⟩)",
			'string.json.parse ← "x"':
				"muss eine JSON-Zeichenkette sein (⟨SyntaxError⟩)",
			'string.lower.preformatted ← "X"': "muss kleingeschrieben sein",
			'string.numeric ← "x"':
				"muss eine wohlgeformte numerische Zeichenkette sein",
			'string.numeric.parse ← "1e400"': "muss endlich sein",
			'string.regex ← "("':
				"muss ein Regex-Muster sein (SyntaxError: Invalid regular expression: /(/: Unterminated group)",
			'string.semver ← "x"':
				"muss eine semantische Version (siehe https://semver.org/) sein",
			'string.trim.preformatted ← " x"':
				"muss ohne Leerraum am Anfang und Ende sein",
			'string.upper.preformatted ← "x"':
				"muss durchgehend großgeschrieben sein",
			'string.url ← "x"': "muss eine URL sein",
			'string.url.parse ← "x"': "muss eine URL sein",
			'string.uuid ← "x"': "muss eine UUID sein",
			'string.uuid.v1 ← "x"': "muss eine UUIDv1 sein",
			'string.uuid.v2 ← "x"': "muss eine UUIDv2 sein",
			'string.uuid.v3 ← "x"': "muss eine UUIDv3 sein",
			'string.uuid.v4 ← "x"': "muss eine UUIDv4 sein",
			'string.uuid.v5 ← "x"': "muss eine UUIDv5 sein",
			'string.uuid.v6 ← "x"': "muss eine UUIDv6 sein",
			'string.uuid.v7 ← "x"': "muss eine UUIDv7 sein",
			'string.uuid.v8 ← "x"': "muss eine UUIDv8 sein",
			'string.json.parse ← ""': "muss eine JSON-Zeichenkette sein",
			"number.epoch ← 1.5": "muss ein Unix-Zeitstempel als ganze Zahl sein",
			"number.epoch ← -900000000000000000000":
				"muss ein Unix-Zeitstempel ab -8640000000000000 sein"
		})
	})

	it("writes none of en's frames", () => {
		attest(
			Object.values(matrixOf(de)).filter(message =>
				/must be|\(was |missing|according to|value at/.test(message)
			)
		).equals([])
	})

	it("renders each keyword phrase an error carries", () => {
		const labels = Object.keys(matrixOf(de))
		attest(
			Object.keys(keywordPhrases).filter(
				alias => !labels.some(label => label.startsWith(`${alias} ←`))
			)
		).snap([
			"FormData.parsed",
			"string.date.epoch",
			"string.normalize.NFC.preformatted",
			"string.normalize.NFD.preformatted",
			"string.normalize.NFKC.preformatted",
			"string.normalize.NFKD.preformatted"
		])
	})

	it("lists as Intl.ListFormat does", () => {
		const or = new ListFormat("de", { type: "disjunction" })
		const and = new ListFormat("de", { type: "conjunction" })
		for (let n = 0; n <= 5; n++) {
			const items = ["a", "b", "c", "d", "e"].slice(0, n)
			attest(de.list(items, "or")).equals(or.format(items))
			attest(de.list(items, "and")).equals(and.format(items))
		}
	})

	it("pluralizes as Intl.PluralRules does", () => {
		const rules = new Intl.PluralRules("de")
		for (const n of [0, 1, 2, 21, 1.5])
			attest(de.plural(n)).equals(rules.select(n) as never)
	})

	it("formats numbers as Intl.NumberFormat does without grouping", () => {
		const format = new Intl.NumberFormat("de", {
			useGrouping: false,
			maximumFractionDigits: 20
		})
		for (const n of [0, 1, -1.5, 0.0001, 1234567.25, 9007199254740991])
			attest(de.number(n)).equals(format.format(n))
	})

	it("renders when configured", () => {
		withConfig({ locale: de }, () =>
			attest(scope({}).type({ name: "string" })({}).toString()).snap(
				"name fehlt (muss eine Zeichenkette sein)"
			)
		)
		withConfig({ locale: () => de }, () =>
			attest(type("string >= 3")("ab").toString()).snap(
				"muss mindestens 3 Zeichen lang sein"
			)
		)
	})

	// https://github.com/arktypeio/arktype/issues/1412
	it("writes constraints described alike once", () => {
		const Email = type("string.email > 0", "@", "Email is not valid")
		attest(Email("").toLocaleString(de))
			.snap(`muss ein Wert gemäß der Beschreibung „Email is not valid“ sein
muss ein Wert gemäß der Beschreibung „Email is not valid“ sein`)
	})

	it("writes what a union is configured to expect after its path", () => {
		const Shape = type({ a: "string" })
			.or({ b: "number" })
			.configure({ expected: "eine Form" })
		const out = type({ shape: Shape })({ shape: {} })
		attest(out.toLocaleString(de)).snap(
			"shape muss ein Wert gemäß der Beschreibung „eine Form“ sein"
		)
	})

	it("writes a line's subject before its message, and a colon before a custom one", () => {
		const Email = type("string.email").configure({
			message: "Bitte eine gültige E-Mail-Adresse eingeben"
		})
		const T = type({
			name: "string",
			email: Email,
			emails: Email.array(),
			"a b": Email
		})
		const out = T({ name: 1, email: "x", emails: ["x"], "a b": "x" })
		attest(out.toLocaleString(de)).snap(`name muss eine Zeichenkette sein
email: Bitte eine gültige E-Mail-Adresse eingeben
emails[0]: Bitte eine gültige E-Mail-Adresse eingeben
Wert an ["a b"]: Bitte eine gültige E-Mail-Adresse eingeben`)
		// its message is the same at the root, where no line is written
		attest(Email("x").toLocaleString(de)).snap(
			"Bitte eine gültige E-Mail-Adresse eingeben"
		)
	})

	it("writes a title as a line's subject, and a colon before a custom message", () => {
		const Email = type("string.email").configure({
			title: "E-Mail",
			message: "Bitte eine gültige E-Mail-Adresse eingeben"
		})
		const T = type({
			name: type("string").configure({ title: "Name" }),
			email: Email,
			emails: Email.array()
		})
		const out = T({ name: 1, email: "x", emails: ["x"] })
		attest(out.toLocaleString(de)).snap(`„Name“ muss eine Zeichenkette sein
„E-Mail“: Bitte eine gültige E-Mail-Adresse eingeben
„E-Mail“ an emails[0]: Bitte eine gültige E-Mail-Adresse eingeben`)
	})

	it("can be spread to change one sentence", () => {
		const deCompact = {
			...de,
			minLength: {
				...de.minLength,
				message: e => `ist zu kurz (mindestens ${e.rule})`
			}
		} satisfies Locale.Complete
		attest(type("string >= 3")("ab").toLocaleString(deCompact)).snap(
			"ist zu kurz (mindestens 3)"
		)
		// a described node's text is cited by the shared message
		attest(
			type("string >= 3")
				.describe("ein Benutzername")("ab")
				.toLocaleString(deCompact)
		).snap("muss ein Wert gemäß der Beschreibung „ein Benutzername“ sein")
	})

	it("can be spread to write descriptions as German", () => {
		const deDescribed: Locale = { ...de, cite: text => text }
		attest(
			type("string >= 3")
				.describe("ein Benutzername")("ab")
				.toLocaleString(deDescribed)
		).snap("muss ein Benutzername sein")
		attest(
			type({ a: type("'x'").describe("ein x") })({}).toLocaleString(deDescribed)
		).snap("a fehlt (muss ein x sein)")
	})
})
