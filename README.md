# wasm-run
Run arbitrary WASM/WASI files

## Installation

This is developed and tested on `Linux + Node.js v14.x`, other versions may need some adjustments (i.e. enabling/disabling experimental flags).

```sh
$ npm install wasm-run -g

$ wasm-run --help        
wasm-run [options] <file> [args..]

Options:
  -i, --invoke   Function to execute  [string]
      --trace    Trace imported function calls  [boolean]
      --version  Show version number  [boolean]
      --help     Show help  [boolean]

$ wasm-run fib32.wasm 32
[tracer] Running fib(32)...
[tracer] Result: 2178309

$ wasm-run --invoke=swap_i64 swap.wasm 12 34
[tracer] Running swap_i64(12,34)...
[tracer] Result: 34,12

$ wasm-run wasi-hello-world.wasm
Hello world!
```

## Features

- [x] Load `wasm` and `wat` files (using `Binaryen`)
- [x] Run specific exported function
- [x] Run `wasi-snapshot-preview1` apps via `--experimental-wasi-unstable-preview1` flag
- [x] Run `wasi-unstable` apps (compatibility layer)
- [x] `i64` args, `multi-value` support (`--experimental-wasm-bigint --experimental-wasm-mv`)
- [x] Generic imports tracing
- [ ] Compiled wasm caching (blocked by [#1](https://github.com/wasm3/node-wasm-run/issues/1))
- [ ] WASI API and structures decoding (generate from witx?)
- [ ] REPL mode
