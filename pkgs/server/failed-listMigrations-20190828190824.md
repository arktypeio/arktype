# Failed listMigrations at 2019-08-28T23:08:24.210Z
## RPC Input One Line
```json
{"id":1,"jsonrpc":"2.0","method":"listMigrations","params":{"projectInfo":"","sourceConfig":"datasource db {\n  provider = \"mysql\"\n  url      = \"127.0.0.1/3306\"\n  default  = true\n}\n\ngenerator photon {\n  provider  = \"photonjs\"\n}\n\nmodel User {\n  id String @default(cuid()) @id @unique\n  email String @unique\n  password String\n  firstName String\n  lastName String\n}\n\nmodel Session {\n  id String @default(cuid()) @id @unique\n  token String\n  user User\n}\n\nmodel Step {\n  id String @default(cuid()) @id @unique\n  key String\n  selector String\n  value String\n  user User\n}\n\nmodel Tag {\n  id String @default(cuid()) @id @unique\n  name String @unique\n  user User\n}\n\nmodel Test {\n  id String @default(cuid()) @id @unique\n  user User\n  name String\n  tags Tag[]\n  steps Step[]\n}\n\n"}}
```

## RPC Input Readable
```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "listMigrations",
  "params": {
    "projectInfo": "",
    "sourceConfig": "datasource db {\n  provider = \"mysql\"\n  url      = \"127.0.0.1/3306\"\n  default  = true\n}\n\ngenerator photon {\n  provider  = \"photonjs\"\n}\n\nmodel User {\n  id String @default(cuid()) @id @unique\n  email String @unique\n  password String\n  firstName String\n  lastName String\n}\n\nmodel Session {\n  id String @default(cuid()) @id @unique\n  token String\n  user User\n}\n\nmodel Step {\n  id String @default(cuid()) @id @unique\n  key String\n  selector String\n  value String\n  user User\n}\n\nmodel Tag {\n  id String @default(cuid()) @id @unique\n  name String @unique\n  user User\n}\n\nmodel Test {\n  id String @default(cuid()) @id @unique\n  user User\n  name String\n  tags Tag[]\n  steps Step[]\n}\n\n"
  }
}
```


## RPC Response
```
null
```

## Stack Trace
```bash
thread 'main' panicked at 'Parsing of the provided connector url failed.: RelativeUrlWithoutBase', src/libcore/result.rs:997:5
stack backtrace:
   0: std::sys::unix::backtrace::tracing::imp::unwind_backtrace
   1: std::sys_common::backtrace::_print
   2: std::panicking::default_hook::{{closure}}
   3: std::panicking::default_hook
   4: std::panicking::rust_panic_with_hook
   5: std::panicking::continue_panic_fmt
   6: rust_begin_unwind
   7: core::panicking::panic_fmt
   8: core::result::unwrap_failed
   9: sql_migration_connector::PrismaMysqlConfig::parse
  10: sql_migration_connector::SqlMigrationConnector::exists
  11: migration_core::connector_loader::load_connector
  12: migration_core::migration_engine::MigrationEngine::init
  13: <F as jsonrpc_core::calls::RpcMethodSimple>::call
  14: <F as jsonrpc_core::calls::RpcMethod<T>>::call
  15: <futures::future::lazy::Lazy<F,R> as futures::future::Future>::poll
  16: <futures::future::then::Then<A,B,F> as futures::future::Future>::poll
  17: <futures::future::map::Map<A,F> as futures::future::Future>::poll
  18: <futures::future::either::Either<A,B> as futures::future::Future>::poll
  19: futures::task_impl::std::set
  20: std::thread::local::LocalKey<T>::with
  21: futures::future::Future::wait
  22: jsonrpc_core::io::IoHandler<M>::handle_request_sync
  23: migration_core::rpc_api::RpcApi::handle
  24: migration_engine::main
  25: std::rt::lang_start::{{closure}}
  26: std::panicking::try::do_call
  27: __rust_maybe_catch_panic
  28: std::rt::lang_start_internal
  29: main

```
