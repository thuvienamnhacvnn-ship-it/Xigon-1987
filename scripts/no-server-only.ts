/**
 * A stand-in for the `server-only` package when a script runs outside Next.
 *
 * `server-only` throws unless the bundler resolved it under the react-server
 * condition, which is exactly what stops server code leaking into a client
 * bundle — and exactly what stops a plain Node script from importing the same
 * modules. `tsconfig.scripts.json` maps the package here so the guard stays in
 * place for the app and gets out of the way for the seed and the smoke test.
 */
export {};
