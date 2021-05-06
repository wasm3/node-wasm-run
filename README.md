# wasm-run
Run arbitrary WASM/WASI files

## Installation

```sh
$ npm install wasm-run -g

$ wasm-run --help        
wasm-run [options] <file> [args..]

Options:
  -i, --invoke   Function to execute  [string]
      --trace    Trace imported function calls  [boolean]
      --version  Show version number  [boolean]
      --help     Show help  [boolean]

$ wasm-run ./test/fib32.wasm 32
[tracer] Running fib(32)...
[tracer] Result: 2178309

$ wasm-run --invoke=swap_i64 ./test/swap.wat 10 12
[tracer] Converted to binary (256 bytes)
[tracer] Running swap_i64(10,12)...
[tracer] Result: 12,10

$ wasm-run wasi-hello-world.wasm
Hello world!
```

## Features

- [x] Load `wasm` and `wat` files (using `Binaryen`)
- [x] Run specific exported function
- [x] Run `wasi-snapshot-preview1` apps via `--experimental-wasi-unstable-preview1` flag
- [x] Run `wasi-unstable` apps (compatibility layer)
- [x] `i64` args, `multi-value`, `bulk-memory`, `tail-calls` support via experimental flags
- [x] Generic imports tracing
- [ ] Compiled wasm caching (blocked by [#1](https://github.com/wasm3/node-wasm-run/issues/1))
- [ ] WASI API and structures decoding (generate from witx?)
- [ ] REPL mode
