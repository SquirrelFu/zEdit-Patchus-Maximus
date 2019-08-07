function alchemyPatcher(helpers, locals, patchFile) {
  function isPotionExcluded(edid) {
    const alchemyExclusions = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyExclusions.json`);
    alchemyExclusions['id'].forEach(exclude => {
      if (edid.includes(exclude) && edid.length >= exclude.length) {
        return true;
      }
    });
    return false;
  }
  function patchPotionEffect(effect, recordIn, potion){
    let oldMagnitude = xelib.GetFloatValue(effect, "EFIT\\Magnitude");
    let oldDuration = xelib.GetIntValue(effect, "EFIT\\Duration");
    helpers.logMessage("Original effect duration: " + oldDuration);
    let magEffect = xelib.GetWinningOverride(xelib.GetLinksTo(effect, "EFID"));
    let oldCost = xelib.GetFloatValue(magEffect, "Magic Effect Data\\DATA\\Base Cost");
    let newMagnitude = recordIn.baseMagnitude;
    let newDuration = recordIn.baseDuration;
    helpers.logMessage("New, baseline duration: " + newDuration);
    let newCost = recordIn.baseCost;
    if (recordIn.potionMult) {
      const alchemyMult = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyMultipliers.json`);
      let isPatched = false;
      Object.keys(alchemyMult).forEach(key => {
        alchemyMult[key].nameBindings.forEach(name => {
          if (xelib.FullName(potion) == name && !isPatched)
          {
            newMagnitude *= alchemyMult[key].magnitudeMult;
            newDuration *=  alchemyMult[key].durationMult;
            isPatched = true;
          }
        });
        alchemyMult[key].namePartials.forEach(record => {
          if (xelib.FullName(potion).includes(record)) {
            newMagnitude *= alchemyMult[key].magnitudeMult;
            newDuration *= alchemyMult[key].durationMult;
            isPatched = true;
          }
        });
      });
    }
    if (newMagnitude != oldMagnitude && newMagnitude >= 0) {
      xelib.SetFloatValue(effect, "EFIT\\Magnitude", newMagnitude);
    }
    if (newDuration != oldDuration && newDuration >= 0){
      helpers.logMessage("New Duration: " + newDuration);
      xelib.SetIntValue(effect, "EFIT\\Duration", newDuration);
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
  return {
    load: {
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
          let alchEffect = getWinningLink(effect, "EFID");
          let newEffect = xelib.CopyElement(alchEffect, patchFile);
          removeMagicSchool(newEffect);
        });
      //TODO: Add switch/case statement for multiple language support.
      let alchRecord = xelib.CopyElement(xelib.GetWinningOverride(alch), patchFile);
      patchPotion(alchRecord);
      }
    }
  }
}