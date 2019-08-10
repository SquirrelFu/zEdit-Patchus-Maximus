function alchemyPatcher(locals, patchFile) {
  function patchPotionEffect(effect, recordIn, potion){
    let oldMagnitude = xelib.GetFloatValue(effect, "EFIT\\Magnitude");
    let oldDuration = xelib.GetIntValue(effect, "EFIT\\Duration");
    let magEffect = xelib.GetWinningOverride(xelib.GetLinksTo(effect, "EFID"));
    let oldCost = xelib.GetFloatValue(magEffect, "Magic Effect Data\\DATA\\Base Cost");
    let newMagnitude = recordIn.baseMagnitude;
    let newDuration = recordIn.baseDuration;
    let newCost = recordIn.baseCost;
    if (recordIn.potionMult) {
      const alchemyMult = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyMultipliers.json`);
      Object.keys(alchemyMult).forEach(mult => {
        let multEntry = alchemyMult[mult];
        multEntry.nameBindings.forEach(name => {
          if (name == xelib.FullName(potion)){
            newMagnitude *= multEntry.magnitudeMult;
            newDuration *= multEntry.durationMult;
          }
        });
        multEntry.namePartials.forEach(part => {
          if (xelib.FullName(potion).includes(part)){
            newMagnitude *= multEntry.magnitudeMult;
            newDuration *= multEntry.durationMult;
          }
        });
      });
    }
    if (newMagnitude != oldMagnitude && newMagnitude >= 0) {
      xelib.SetFloatValue(effect, "EFIT\\Magnitude", newMagnitude);
    }
    if (newDuration != oldDuration && newDuration >= 0){
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
  function isPotionExcluded(edid) {
    const alchemyExclusions = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyExclusions.json`);
    let idPartials = alchemyExclusions['idpartials'];
    let idList = alchemyExclusions['id'];
    for (i = 0; i < idPartials.length; i++) {
      if (edid.includes(idPartials[i]) && edid.length > idPartials[i].length) {
        return true;
      }
    }
    for (i = 0; i < idList.length; i++) {
      if (edid == idList[i]){
        return true;
      }
    }
    return false;
  }
  return {
    load: {
      signature: 'ALCH',
      filter: alch => {
        let alchFlags = xelib.GetEnabledFlags(alch, "ENIT\\Flags");
        let potionCheck = !alchFlags.includes("Food Item") && !isPotionExcluded(xelib.EditorID(alch)) && locals.useThief;
        return potionCheck;
      },
    },
    patch: alch => {
      if(xelib.HasElement(alch, "Effects\\Effect\\EFID")) {
        let effectList = xelib.GetElements(alch, "Effects", false);
        effectList.forEach( effect => {
          let alchEffect = getWinningLink(effect, "EFID");
          let newEffect = xelib.CopyElement(alchEffect, patchFile);
          removeMagicSchool(newEffect);
        });
        let alchRecord = xelib.CopyElement(xelib.GetWinningOverride(alch), patchFile);
        patchPotion(alchRecord);
      }
    }
  }
}