#!/usr/bin/env node

/*
 * TODO:
 * [ ] --inspect
 * [ ] check if imports are satisfied, print missing parts
 * [ ] auto-import memory
 * [ ] --validate flag
 * [ ] --imports flag
 */

"use strict";

/*
 * Author: Volodymyr Shymanskyy
 */

const fs = require("fs");
const assert = require("assert");
const chalk = require("chalk");
const r = require("restructure");

/*
 * Arguments
 */

const argv = require("yargs")
    .usage("$0 [options] <file> [args..]")
    .example('$0 fib32.wasm 32', 'run a single exported function')
    .example('$0 --invoke=swap_i64 swap.wat 10 12', 'wat file with multivalue support')
    .example('$0 test-wasi-snapshot-preview1.wasm', 'wasi support')
    .example('$0 test-wasi-unstable.wasm', 'wasi-unstable compatibility layer')
    .example('$0 --trace wasi-hello-world.wasm', 'exported function tracing')
    .example('$0 --gas-limit=500000000 coremark.metered.wasm', 'gas metering')
    .option({
      "respawn": { type: "boolean", hidden: true },
      "invoke": {
        alias: "i",
        type: "string",
        describe: "Function to execute",
        nargs: 1
      },
      "timeout": {
        alias: "t",
        type: "int",
        describe: "Execution timeout (ms)",
        nargs: 1
      },
      "trace": {
        type: "boolean",
        describe: "Trace imported function calls",
      },
      "gas-limit": {
        type: "float",
        describe: "Gas limit",
        default: 100000,
        nargs: 1
      },
    })
    .string('_')
    .strict()
    .version()
    .help()
    .wrap(null)
    .argv;

/*
 * Respawn with experimental flags
 */

if (!argv.respawn)
{
    const { execFileSync, spawnSync } = require('child_process');
    const node = process.argv[0];
    const script = process.argv[1];
    const script_args = process.argv.slice(2);

    let allFlags = execFileSync(node, ["--v8-options"]).toString();
    allFlags += execFileSync(node, ["--help"]).toString();

    const nodeFlags = [ "--experimental-wasm-bigint",
                        "--experimental-wasm-mv",
                        "--experimental-wasm-return-call",
                        "--experimental-wasm-bulk-memory",
                        "--experimental-wasi-unstable-preview1",
                        "--wasm-opt"].filter(x => allFlags.includes(x));

    let res = spawnSync(node,
                        [...nodeFlags, script, "--respawn", ...script_args],
                        { stdio: ['inherit', 'inherit', 'inherit'],
                          timeout: argv.timeout });

    if (res.error) {
        fatal(res.error);
    }
    process.exit(res.status);
}

/*
 * Helpers
 */

function fatal(msg) {
  console.error(chalk.grey('[runtime] ') + chalk.red.bold("Error: ") + msg);
  process.exit(1);
}

function warn(msg) {
  console.error(chalk.grey('[runtime] ') + chalk.yellow.bold("Warning: ") + msg);
}

function log(msg) {
  console.error(chalk.grey('[runtime] ') + msg);
}

class EncodeBuffer {
  constructor(bufferSize) {
    bufferSize = bufferSize || 65536;

    this.pos = 0;
    this.buff = Buffer.alloc(bufferSize);

    for (let key in Buffer.prototype) {
      if (key.slice(0, 5) === 'write') {
        (function(key) {
          const bytes = r.DecodeStream.TYPES[key.replace(/write|[BL]E/g, '')];
          return EncodeBuffer.prototype[key] = function(value) {
            this.buff[key](value, this.pos);
            return this.pos += bytes;
          };
        })(key);
      }
    }
  }

  get buffer() {
    return this.buff.slice(0, this.pos);
  }

  writeString(string, encoding) {
    encoding = encoding || 'ascii';

    switch (encoding) {
      case 'utf16le':
      case 'ucs2':
      case 'utf8':
      case 'ascii':
        return this.writeBuffer(Buffer.from(string, encoding));
      default:
        throw new Error('String encoding need to be implemented with iconv-lite.');
    }
  }

  writeBuffer(buffer) {
    buffer.copy(this.buff, this.pos);
    return this.pos += buffer.length;
  }

  fill(val, length) {
    this.buff.fill(val, this.pos, this.pos + length);
    return this.pos += length;
  }
}

function encodeStruct(T, data) {
  let encoder = new EncodeBuffer(T.size());
  T.encode(encoder, data);
  assert.equal(encoder.buffer.length, T.size());
  return encoder.buffer;
};

function decodeStruct(T, buff) {
  buff = new Buffer(buff);
  assert.equal(buff.length, T.size());
  return T.decode(new r.DecodeStream(buff));
};

/*
async function wat2wasm(binary)
{
    const wat = binary.toString()
        .replace(/\(\;.*?\;\)/,  '')
        .replace(/local\.get/g,  'get_local')
        .replace(/global\.get/g, 'get_global')
        .replace(/local\.set/g,  'set_local')
        .replace(/global\.set/g, 'set_global');

    const wabt = await (require("wabt")());

    const module = wabt.parseWat("mod.wasm", wat);
    module.resolveNames();
    module.validate();

    let result = module.toBinary({
        log: false,
        write_debug_names: true,
        canonicalize_lebs: true,
        relocatable: true,
    }).buffer;

    return result;
}
*/

async function wat2wasm(binary)
{
    const Binaryen = require("binaryen");
    Binaryen.setDebugInfo(true);

    const wat = binary.toString()
        .replace(/get_local/g,  'local.get')
        .replace(/get_global/g, 'global.get')
        .replace(/set_local/g,  'local.set')
        .replace(/set_global/g, 'global.set');

    let module = Binaryen.parseText(wat);
    let result = module.emitBinary();
    module.dispose();

    return result;
}

async function parseWasmInfo(binary)
{
    const Binaryen = require("binaryen");
    Binaryen.setDebugInfo(true);

    let module = Binaryen.readBinary(binary);

    function decodeType(t) {
        switch (t) {
        case Binaryen.none: return "none";
        case Binaryen.i32:  return "i32";
        case Binaryen.i64:  return "i64";
        case Binaryen.f32:  return "f32";
        case Binaryen.f64:  return "f64";
        case Binaryen.v128: return "v128";
        case Binaryen.funcref: return "funcref";
        case Binaryen.anyref:  return "anyref";
        case Binaryen.nullref: return "nullref";
        case Binaryen.exnref:  return "externref";
        default:               return "unknown";
        }
    }

    let result = {
        funcsByIndex: [],
        funcsByName: {}
    };

    for (let i = 0; i < module.getNumFunctions(); i++) {
        let info = Binaryen.getFunctionInfo(module.getFunctionByIndex(i));

        result.funcsByIndex[i] = result.funcsByName[info.name] = {
            index:      i,
            params:     Binaryen.expandType(info.params).map(x => decodeType(x)),
            results:    Binaryen.expandType(info.results).map(x => decodeType(x)),
        }
    }

    for (let i = 0; i < module.getNumExports(); i++) {
        let exp = Binaryen.getExportInfo(module.getExportByIndex(i));

        if (exp.kind == Binaryen.ExternalFunction) {
            let item = result.funcsByName[exp.value];
            result.funcsByName[exp.name] = item;
        }
    }

    module.dispose();

    return result;
}


/*******************************************************************
 * Main
 *******************************************************************/

(async () => {
    const inputFile = argv._[0]

    if (!inputFile) {
        fatal(`Please specify input file. See ${chalk.white.bold('--help')} for details.`);
    }

    let binary;
    try {
        binary = fs.readFileSync(inputFile);
    } catch (e) {
        fatal(`File ${chalk.white.bold(inputFile)} not found`);
    }
    
    if (inputFile.endsWith('.wat')) {
        binary = await wat2wasm(binary);
        log(`Converted to binary (${binary.length} bytes)`);
    }

    /*
     * Compile
     */

    /* TODO: caching
        const v8 = require('v8');
        const compiled = await WebAssembly.compile(binary);
        const cached = v8.serialize(compiled);
        binary = v8.deserialize(cached);
    */
    
    let module = await WebAssembly.compile(binary);

    /*
     * Analyze
     */

    let wasmInfo = {}

    let expectedImports = WebAssembly.Module.imports(module);
    for (const i of expectedImports) {
        if (i.module.startsWith("wasi_")) {
            wasmInfo.wasiVersion = i.module;
        }
    }

    wasmInfo.exportedFuncs = WebAssembly.Module.exports(module).filter(x => x.kind == 'function').map(x => x.name);

    /*
     * Prepare imports
     */

    let imports = { }

    /*
     * Gas Metering
     */

    const GAS_FACTOR = 10000;

    let ctx = {
        gasCurrent: argv.gasLimit * GAS_FACTOR,
        gasLimit:   argv.gasLimit * GAS_FACTOR,
    };

    function getGasUsed() {
        return (ctx.gasLimit - ctx.gasCurrent) / GAS_FACTOR;
    }

    function printGasUsed() {
        const gasUsed = getGasUsed();
        if (gasUsed) {
            log(`Gas used: ${gasUsed.toFixed(4)}`);
        }
    }

    imports.metering = {
        usegas: function (gas) {
            if ((ctx.gasCurrent -= gas) < 0) {
                throw `Run out of gas (gas used: ${getGasUsed().toFixed(4)})`;
            }
        }
    }

    /*
     * WASI
     */

    if (wasmInfo.wasiVersion)
    {
        const { WASI } = require('wasi');
        ctx.wasi = new WASI({
            returnOnExit: true,
            args: argv._,
            env: {
                "NODEJS": 1
            },

            // TODO: --mapdir flag
            preopens: {
                "/": ".",
                ".": ".",
            }
        });

        const wasiImport = ctx.wasi.wasiImport;

        if (wasmInfo.wasiVersion == "wasi_snapshot_preview1") {
            imports.wasi_snapshot_preview1 = wasiImport;
        } else if (wasmInfo.wasiVersion == "wasi_unstable") {
            imports.wasi_unstable = Object.assign({}, wasiImport);

            const uint8  = r.uint8;
            const uint16 = r.uint16le;
            const uint32 = r.uint32le;
            const uint64 = new r.Struct({ lo: uint32, hi: uint32 });

            const wasi_snapshot_preview1_filestat_t = new r.Struct({
                dev: uint64,   // 0
                ino: uint64,   // 8
                ftype: uint8,  // 16
                pad0:  new r.Reserved(uint8, 7),
                nlink: uint64, // 24
                size: uint64,  // 32
                atim: uint64,  // 40
                mtim: uint64,  // 48
                ctim: uint64   // 56
            }); // size = 64

            const wasi_unstable_filestat_t = new r.Struct({
                dev: uint64,   // 0
                ino: uint64,   // 8
                ftype: uint8,  // 16
                pad0:  new r.Reserved(uint8, 3),
                nlink: uint32, // 20
                size: uint64,  // 24
                atim: uint64,  // 32
                mtim: uint64,  // 40
                ctim: uint64   // 48
            }); // size = 56

            imports.wasi_unstable.fd_seek = function(fd, offset, whence, result) {
                switch (whence) {
                case 0: whence = 1; break;  // cur
                case 1: whence = 2; break;  // end
                case 2: whence = 0; break;  // set
                default: throw "Invalid whence";
                }
                const res = wasiImport.fd_seek(fd, offset, whence, result);
                return res;
            }
            imports.wasi_unstable.fd_filestat_get = function(fd, buf) {
                const mem = new Uint8Array(ctx.memory.buffer);
                const backup = mem.slice(buf+56, buf+(64-56));

                const res = wasiImport.fd_filestat_get(fd, buf);

                const modified = encodeStruct(wasi_unstable_filestat_t,
                                              decodeStruct(wasi_snapshot_preview1_filestat_t,
                                                           mem.slice(buf, buf+64)));
                mem.set(modified, buf);     // write new struct
                mem.set(backup, buf+56);    // restore backup
                return res;
            }
            imports.wasi_unstable.path_filestat_get = function(fd, flags, path, path_len, buf) {
                const mem = new Uint8Array(ctx.memory.buffer);
                const backup = mem.slice(buf+56, buf+(64-56));

                const res = wasiImport.path_filestat_get(fd, flags, path, path_len, buf);

                const modified = encodeStruct(wasi_unstable_filestat_t,
                                              decodeStruct(wasi_snapshot_preview1_filestat_t,
                                                           mem.slice(buf, buf+64)));
                mem.set(modified, buf);     // write new struct
                mem.set(backup, buf+56);    // restore backup
                return res;
            }
        } else {
            fatal(`Unsupported WASI version: ${wasmInfo.wasiVersion}`);
        }
    }

    // TODO: WASI API + structures decoding (generate from witx?)
    if (argv.trace) {
        function traceGeneric(name, f) {
            return function (...args) {
                try {
                    let res = f.apply(this, args);
                    log(`${name} ${args.join()} => ${res}`);
                    return res;
                } catch (e) {
                    log(`${name} ${args.join()} => ${e}`);
                    throw e;
                }
            }
        }

        let newimports = {}
        for (const [modname, mod] of Object.entries(imports)) {
            newimports[modname] = {}
            for (const [funcname, func] of Object.entries(mod)) {
                newimports[modname][funcname] = traceGeneric(`${modname}!${funcname}`, func);
            }
        }

        imports = newimports;
    }

    /*
     * Execute
     */

    try {
        let instance = await WebAssembly.instantiate(module, imports);

        // If no WASI is detected, and no func specified -> try to run the only function
        if (!argv.invoke && !wasmInfo.wasiVersion && wasmInfo.exportedFuncs.length == 1) {
            argv.invoke = wasmInfo.exportedFuncs[0];
        }

        if (argv.invoke) {
            if (!wasmInfo.exportedFuncs.includes(argv.invoke)) {
                fatal(`Function not found: ${argv.invoke}`);
            }
            let args = argv._.slice(1)

            let wasmInfo2 = await parseWasmInfo(binary);
            //console.log(JSON.stringify(wasmInfo2));
            let funcInfo = wasmInfo2.funcsByName[argv.invoke];

            for (let i = 0; i < funcInfo.params.length; i++) {
                switch (funcInfo.params[i]) {
                case 'i32': args[i] = parseInt(args[i]);    break;
                case 'i64': args[i] = BigInt(args[i]);      break;
                case 'f32':
                case 'f64': args[i] = parseFloat(args[i]);  break;
                }
            }

            log(`Running ${argv.invoke}(${args})...`);
            let func = instance.exports[argv.invoke];
            let result = func(...args);
            log(`Result: ${result}`);
            printGasUsed();
        } else {
            ctx.memory = instance.exports.memory;
            let exitcode = ctx.wasi.start(instance);
            if (exitcode) {
                log(`Exit code: ${exitcode}`);
            }
            printGasUsed();
            process.exit(exitcode);
        }
    } catch (e) {
        fatal(e);
    }
})();
