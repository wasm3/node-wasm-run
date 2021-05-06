# MAL (Make A Lisp)

Run Lisp REPL:
```
$ wasm-run mal.wasm
Mal [WebAssembly]
user> (+ 1 2)
3
```

Run fib function:
```
$ wasm-run mal.wasm ./fib.mal 11
89
```

Run Lisp REPL (self-hosting):

```
$ wasm-run mal.wasm ./mal.mal
Mal [WebAssembly-mal]
nil
mal-user> (+ 1 2)
3
```

Run fib function (self-hosting):
```
$ wasm-run mal.wasm ./mal.mal ./fib.mal 10
55
```
