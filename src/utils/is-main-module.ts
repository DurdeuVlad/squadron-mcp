import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * True when this module was invoked directly as the process entry point
 * (`node path/to/file.js`), including through a symlink such as an
 * npm-installed bin shim (node_modules/.bin/<name>, which Node resolves to
 * its real target for import.meta.url but leaves as-is in process.argv[1]) --
 * false when the module was merely imported as a library by something else.
 */
export function isMainModule(moduleUrl: string, argv1: string | undefined): boolean {
  if (!argv1) {
    return false;
  }
  try {
    return moduleUrl === pathToFileURL(realpathSync(argv1)).href;
  } catch {
    return false;
  }
}
