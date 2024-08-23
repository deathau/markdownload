// used to extract a "module" from globalThis, like Readability.js supplies
export default async function require(module) {
  globalThis.module = {}
  await import(module)
  const exports = globalThis.module.exports
  delete globalThis.module;
  return exports
}