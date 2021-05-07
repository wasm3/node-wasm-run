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
wasm-run [options] <file> [--] [args..]

Options:
  -i, --invoke     Function to execute  [string]
  -t, --timeout    Execution timeout (ms)
      --trace      Trace imported function calls  [boolean]
      --gas-limit  Gas limit  [default: 100000]
      --version    Show version number  [boolean]
      --help       Show help  [boolean]
```

#### Run a single exported function
```sh
$ wasm-run ./test/fib32.wasm 32
[runtime] Running fib(32)...
[runtime] Result: 2178309
```

#### WAT file with multivalue support
```sh
$ wasm-run --invoke=swap_i64 ./test/swap.wat 10 12
[runtime] Converted to binary (256 bytes)
[runtime] Running swap_i64(10,12)...
[runtime] Result: 12,10
```

#### WASI support
```sh
$ wasm-run wasi-hello-world.wasm
Hello world!
```

#### Imported function tracing
```sh
$ wasm-run --trace wasi-hello-world.wasm
[runtime] wasi_snapshot_preview1!fd_prestat_get 3,65528 => 0
[runtime] wasi_snapshot_preview1!fd_prestat_dir_name 3,70064,2 => 0
[runtime] wasi_snapshot_preview1!fd_prestat_get 4,65528 => 0
[runtime] wasi_snapshot_preview1!fd_prestat_dir_name 4,70064,2 => 0
...
```

#### Gas metering/limiting
`wasm-meter` can be installed via `npm install wasm-metering -g`
```sh
$ wasm-meter fib64.wasm fib64.metered.wasm
$ wasm-run fib64.metered.wasm 8
[runtime] Running fib(8)...
[runtime] Result: 21
[runtime] Gas used: 5.1874
$ wasm-run fib64.metered.wasm 30
[runtime] Running fib(30)...
[runtime] Error: Run out of gas (gas used: 100000.0177)
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
