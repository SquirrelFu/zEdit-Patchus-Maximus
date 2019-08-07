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