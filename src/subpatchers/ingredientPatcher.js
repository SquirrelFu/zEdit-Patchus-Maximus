function ingredientPatcher(locals, patchFile) {
  function ingredientFilter(ingr) {
    const excludeList = fh.loadJsonFile(`${patcherPath}/json/ingredients/ingredientExclusions.json`);
    let idMatch = excludeList['id'];
    let idPartial = excludeList['idpartials'];
    for (i = 0; i < idMatch.length; i++) {
      if (ingr == idMatch[i]) {
        return true;
      }
    }
    for (p = 0; p < idPartial.length; p++) {
      if (ingr.includes(idPartial[p]) && ingr.length > idPartial[p].length) {
        return true;
      }
    }
  return false;
  }
  return {
    load: {
      signature: 'INGR',
      filter: ingr => !ingredientFilter(xelib.EditorID(ingr)) && locals.useThief
    },
    patch: ingr => {
      let patchIngr = xelib.CopyElement(ingr, patchFile);
      const alchEffects = fh.loadJsonFile(`${patcherPath}/json/alchemy/alchemyEffects.json`);
      const ingredientTiers = fh.loadJsonFile(`${patcherPath}/json/ingredients/ingredientTiers.json`);
      let ingrEffects = xelib.GetElements(patchIngr, "Effects");
      ingrEffects.forEach(eff => {
        Object.keys(alchEffects).forEach(def => {
          let alchDef = def;
          alchEffects[def].nameBindings.forEach(name => {
          if (xelib.FullName(getWinningLink(eff, "EFID")) == name) {
            let oldMagnitude = xelib.GetFloatValue(eff, "EFIT\\Magnitude");
            let oldDuration = xelib.GetIntValue(eff, "EFIT\\Duration");
            let newMagnitude = alchEffects[alchDef].baseMagnitude;
            let newDuration = alchEffects[alchDef].baseDuration;
            if (alchEffects[alchDef].ingredientMult) {
              Object.keys(ingredientTiers).forEach(tier => {
                let tierDef = tier;
                ingredientTiers[tier].nameBindings.forEach(name2 => {
                if (name2 == xelib.FullName(patchIngr)) {
                  newMagnitude *= ingredientTiers[tierDef].magnitudeMult;
                  newDuration *= ingredientTiers[tierDef].durationMult;
                }
                });
              });
            }
            if (oldDuration != newDuration) {
              xelib.SetIntValue(eff, "EFIT\\Duration", newDuration);
            }
            if (oldMagnitude != newMagnitude) {
              xelib.SetFloatValue(eff, "EFIT\\Magnitude", newMagnitude);
            }
          }
          });
        });
      });
    }
  }
}