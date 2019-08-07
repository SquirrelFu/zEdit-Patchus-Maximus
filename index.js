/* global xelib, modulePath, registerPatcher, patcherUrl, fh */

//=require src/common/utilityMethods.js
//=require src/subpatchers/alchemyPatcher.js

const getActiveModules = (helpers, locals) => {
    const modulePrefix = "PerkusMaximus_";
    const moduleEndings = ["Mage", "Warrior", "Thief"];
    moduleEndings.forEach(suffix => {
      const fullModuleString = `${modulePrefix}${suffix}.esp`;
      const moduleLoaded = xelib.GetLoadedFileNames().find(string => string === fullModuleString);
      if (moduleLoaded) {
        locals[`use${suffix}`] = true;
      }
      else {
        helpers.logMessage(`${suffix} module not loaded, associated patching and additions will not be present.`);
      }
    });
  };

registerPatcher({
  info: info,
  gameModes: [xelib.gmSSE,xelib.gmTES5],
  settings: {
    label: 'Patchus Maximus',
    defaultSettings: {
      patchFileName:'PatchusMaximus.esp',
      gameSettings: {
        fArmorScalingFactor: 0.1,
        fMaxArmorRating: 90.0,
        fArmorRatingMax: 1.75,
        fArmorRatingPCMax: 1.4
      }
    }
  },
  requiredFiles:['PerkusMaximus_Master.esp'],
  execute: (patchFile, helpers, settings, locals) => ({
    initialize: () => {
      getActiveModules(helpers, locals);
      locals.playerFormID = '00000007';
      locals.playerRefFormID = '00000014';
    },
    process: [
      alchemyPatcher(helpers, locals, patchFile)
    ],
  })
});