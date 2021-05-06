# wasm-run
Run arbitrary WASM/WASI files

[![NPM version](https://img.shields.io/npm/v/wasm-run.svg)](https://www.npmjs.com/package/wasm-run)
[![GitHub stars](https://img.shields.io/github/stars/wasm3/node-wasm-run.svg)](https://github.com/wasm3/node-wasm-run)
[![GitHub issues](https://img.shields.io/github/issues/wasm3/node-wasm-run.svg)](https://github.com/wasm3/node-wasm-run/issues)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/wasm3/node-wasm-run)

## Installation

```sh
$ npm install wasm-run -g
```

## Usage

```sh
$ wasm-run --help        
wasm-run [options] <file> [args..]

Options:
  -i, --invoke     Function to execute
  -t, --timeout    Execution timeout (ms)
      --trace      Trace imported function calls
      --gas-limit  Gas limit  [default: 100000]
      --version    Show version number
      --help       Show help

$ wasm-run ./test/fib32.wasm 32
[tracer] Running fib(32)...
[tracer] Result: 2178309

$ wasm-run --invoke=swap_i64 ./test/swap.wat 10 12
[tracer] Converted to binary (256 bytes)
[tracer] Running swap_i64(10,12)...
[tracer] Result: 12,10

$ wasm-run wasi-hello-world.wasm
Hello world!

$ wasm-run --trace wasi-hello-world.wasm
[tracer] wasi_snapshot_preview1!fd_prestat_get 3,65528 => 0
[tracer] wasi_snapshot_preview1!fd_prestat_dir_name 3,70064,2 => 0
[tracer] wasi_snapshot_preview1!fd_prestat_get 4,65528 => 0
[tracer] wasi_snapshot_preview1!fd_prestat_dir_name 4,70064,2 => 0
...
```

## Features

☑ Load `wasm` and `wat` files (using `Binaryen`)  
☑ Run specific exported function  
☑ Run `wasi-snapshot-preview1` apps via `--experimental-wasi-unstable-preview1` flag  
☑ Run `wasi-unstable` apps (compatibility layer)  
☑ `i64` args, `multi-value`, `bulk-memory`, `tail-calls` support via experimental flags  
☑ Generic imports tracing  
☑ Gas metering/limiting  
☐ Compiled wasm caching (blocked by [#1](https://github.com/wasm3/node-wasm-run/issues/1))  
☐ WASI API and structures decoding (generate from witx?)  
☐ REPL mode  
