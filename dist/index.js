/* global xelib, modulePath, registerPatcher, patcherUrl, fh */

function removeMagicSchool(record) {
  if (xelib.HasElement(record, "Magic Effect Data\\DATA\\Magic Skill") && xelib.GetValue(record, "Magic Effect Data\\DATA\\Magic Skill") != "None") {
    let newRecord =  xelib.SetValue(record, "Magic Effect Data\\DATA\\Magic Skill", "None");
    return newRecord;
  }
  return record;
}
function patchPotionEffect(effect, recordIn, potion){
  
  let oldMagnitude = xelib.GetFloatValue(effect, "EFIT\\Magnitude");
  let oldDuration = xelib.GetFloatValue(effect, "EFIT\\Duration");
  let magEffect = xelib.GetWinningOverride(xelib.GetLinksTo(effect, "EFID"));
  let oldCost = xelib.GetFloatValue(magEffect, "Magic Effect Data\\DATA\\Base Cost");
  let newMagnitude = recordIn.baseMagnitude;
  let newDuration = recordIn.baseDuration;
  let newCost = recordIn.baseCost;
  if (recordIn.potionMult) {
    const alchemyMult = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyMultipliers.json`);
    Object.keys(alchemyMult).forEach(key => {
      alchemyMult[key].nameBindings.forEach(name => {
        if(xelib.FullName(potion).includes(name))
        {
          newMagnitude *= alchemyMult[key].magnitudeMult;
          newDuration *= alchemyMult[key].durationMult;
        }
      });
    });
  }
  if (newMagnitude != oldMagnitude && newMagnitude >= 0) {
    xelib.SetFloatValue(effect, "EFIT\\Magnitude", newMagnitude);
  }
  if (newDuration != oldDuration && newDuration >= 0){
    xelib.SetFloatValue(effect, "EFIT\\Duration", newDuration);
    let activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    if (!xelib.GetValue(magEffect, "DNAM").includes(activeStrings["DurReplace"])) {
      xelib.SetFlag(magEffect, "Magic Effect Data\\DATA\\Flags","No Duration", false);
      let oldDesc = xelib.GetValue(magEffect, "DNAM");
      let newDesc = oldDesc + " [" + activeStrings["Duration"] + ": " + activeStrings["seconds"] + " ]";
      xelib.SetValue(magEffect, "DNAM", newDesc);
    }
  }
  if (newCost != oldCost && newCost >= 0) {
    xelib.SetFloatValue(magEffect, "Magic Effect Data\\DATA\\Base Cost", newCost);
  }
}
function patchPotion(potion) {
  const alchemyEffects = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyEffects.json`);
  let recordOutput = potion;
  Object.keys(alchemyEffects).forEach(key =>{
    alchemyEffects[key].nameBindings.forEach(name => {
    if(xelib.FullName(potion).includes(name)) {
      let effectRecord = alchemyEffects[key]
      xelib.GetElements(potion, "Effects").forEach (effect => {
        patchPotionEffect(effect,alchemyEffects[key], potion);
      });
    }
    });
  });
}
function getWinningLink(record, path) {
  let newLink = xelib.GetLinksTo(record, path);
  return xelib.GetWinningOverride(newLink);
}
function isPotionExcluded(edid) {
  const alchemyExclusions = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyExclusions.json`);
  alchemyExclusions['id'].forEach(exclude => {
    if (edid.includes(exclude) && edid.length > exclude.length) {
      return true;
    }
  });
  return false;
}

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
    process: [{
      load:{
        //Alchemy patching section
        signature: 'ALCH',
        filter: function(alch) {
          let alchFlags = xelib.GetEnabledFlags(alch, "ENIT\\Flags");
          return !alchFlags.includes("Food Item") && !isPotionExcluded(xelib.EditorID(alch)) && locals.useThief;
        }
      },
      patch: function(alch) {
        if(xelib.HasElement(alch, "Effects\\Effect\\EFID")) {
          let effectList = xelib.GetElements(alch, "Effects", false);
          effectList.forEach( effect => {
            helpers.logMessage("Individual Effect: " + effect);
            let alchEffect = getWinningLink(effect, "EFID");
            let newEffect = xelib.CopyElement(alchEffect, patchFile);
            removeMagicSchool(newEffect);
          });
        //TODO: Add switch/case statement for multiple language support.
        let alchRecord = xelib.CopyElement(xelib.GetWinningOverride(alch), patchFile);
        patchPotion(alchRecord);
        }
      }
    }],
  })
});