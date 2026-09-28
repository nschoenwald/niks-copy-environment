export const name = 'niks-copy-environment';

export const templates = {
  settings: `modules/${name}/templates/settings.html`,
  exportDialog: `modules/${name}/templates/export-dialog.hbs`,
  importDialog: `modules/${name}/templates/import-dialog.hbs`,
};

export function log(force, ...args) {
  try {
    if (typeof force !== "boolean") {
      console.warn(
        'Copy Environment | Invalid log usage. Expected "log(force, ...args)" as boolean but got',
        force
      );
    }

    const isDebugging = window.DEV?.getPackageDebugValue(name);

    if (force || isDebugging) {
      console.log("Copy Environment |", ...args);
    }
  } catch (e) {
  }
}
