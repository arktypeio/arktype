// @ark/schema's runtime for arktype's, which turbopack.resolveAlias names in
// place of @ark/schema/runtime. The @ark/aot/turbopack loader writes it as the
// entry the build's options load, like @ark/schema/runtime/none, so the alias
// is alike for every option set: Next 16.4.1 hangs a build, its cache on, past
// one that resolved @ark/schema/runtime through an alias it then lacks.
//
// Where the loader doesn't run on it, as where no rule matches JavaScript that
// mentions arktype, it exports nothing, so arktype's imports from it fail the
// build.
export {}
