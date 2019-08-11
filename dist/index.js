/* global xelib, modulePath, registerPatcher, patcherUrl, fh */

function removeMagicSchool(record) {
  if (xelib.HasElement(record, "Magic Effect Data\\DATA\\Magic Skill") && xelib.GetValue(record, "Magic Effect Data\\DATA\\Magic Skill") != "None") {
    let newRecord =  xelib.SetValue(record, "Magic Effect Data\\DATA\\Magic Skill", "None");
    return newRecord;
  }
  return record;
}
function getWinningLink(record, path) {
  let newLink = xelib.GetLinksTo(record, path);
  return xelib.GetWinningOverride(newLink);
}
function safeCache(record, helpers) {
  //Due to the lack of one-to-one relationships in Skyrim data, I've made this function
  //so that caching can happen without worries about automatically caching the same record
  //twice.
  let thisFile = xelib.FileByName("PatchusMaximus.esp");
  let signatureIn = xelib.Signature(record);
  let edidCheck = xelib.FindValidReferences(thisFile, signatureIn, xelib.EditorID(record));
  if (!edidCheck.length > 0) {
    helpers.CacheRecord(record, xelib.EditorID(record));
  }
}
//A minor note, "10000000" is the binary code for an, "Equal To" operator whereas
//11000000 is, "Greater than or equal to".
function addHasPerk(root, perk) {
  let newCond = xelib.AddElement(root, "Conditions\\Condition");
  xelib.AddElementValue(newCond, "CTDA\\Type", "10000000");
  xelib.AddElementValue(newCond, "CTDA\\Function", "HasPerk");
  xelib.AddElementValue(newCond, "CTDA\\Comparison Value - Float", "1.0");
  xelib.AddElementValue(newCond, "CTDA\\Perk", perk);
  xelib.AddElementValue(newCond, "CTDA\\Run On", "Subject");
}
function addBlockerPerk(root, perk) {
  let newCond = xelib.AddElement(root, "Conditions\\Condition");
  xelib.AddElementValue(newCond, "CTDA\\Type", "10000000");
  xelib.AddElementValue(newCond, "CTDA\\Function", "HasPerk");
  xelib.AddElementValue(newCond, "CTDA\\Comparison Value - Float", "0.0");
  xelib.AddElementValue(newCond, "CTDA\\Perk", perk);
  xelib.AddElementValue(newCond, "CTDA\\Run On", "Subject");
}
function addRecipeMinimum(root, item) {
  let newCond = xelib.AddElement(root, "Conditions\\Condition");
  xelib.AddElementValue(newCond, "CTDA\\Type", "11000000");
  xelib.AddElementValue(newCond, "CTDA\\Function", "GetItemCount");
  xelib.AddElementValue(newCond, "CTDA\\Comparison Value - Float", "1.0");
  xelib.AddElementValue(newCond, "CTDA\\Inventory Object", item);
  xelib.AddElementValue(newCond, "CTDA\\Run On", "Subject");
}
function addRecipeIngredient(root, item, quantity) {
  let newItem = xelib.AddElement(root, "Items\\Item");
  xelib.AddElementValue(newItem, "CNTO\\Item", item);
  xelib.AddElementValue(newItem, "CNTO\\Count", quantity);
}
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
function ammoPatcher(locals, patchFile, helpers) {
  const ammoTypes = fh.loadJsonFile(`${patcherPath}/json/ammo/ammoTypes.json`);
  const ammoMats = fh.loadJsonFile(`${patcherPath}/json/ammo/ammoMaterials.json`);
  const ammoMods = fh.loadJsonFile(`${patcherPath}/json/ammo/ammoModifiers.json`);
  const ammoExclude = fh.loadJsonFile(`${patcherPath}/json/ammo/ammoExclusions.json`);
  const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
  function generateVariants(ammoIn, patchFile, type, mat) {
    let perkList = ["xMAALCPoisonBurst"];
    let ingredientList = ["deathBell"];
    let poisonAmmo = makePoisonAmmo(ammoIn, patchFile, type, mat);
    makeAmmoRecipeVariants(ammoIn, poisonAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    perkList = ["xMAALCElementalBombard"];
    ingredientList = ["FireSalts"];
    let fireAmmo = makeFireAmmo(ammoIn, patchFile, type, mat);
    makeAmmoRecipeVariants(ammoIn, fireAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    ingredientList = ["FrostSalts"];
    let frostAmmo = makeFrostAmmo(ammoIn, patchFile, type, mat);
    makeAmmoRecipeVariants(ammoIn, frostAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    ingredientList = ["VoidSalts"];
    let shockAmmo = makeShockAmmo(ammoIn, patchFile, type, mat);
    makeAmmoRecipeVariants(ammoIn, shockAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    perkList = ["xMAALCFuse"];
    ingredientList = ["FireflyThorax", "Ale"];
    let explosiveAmmo = makeExplosiveAmmo(ammoIn, patchFile, type, mat);
    makeAmmoRecipeVariants(ammoIn, explosiveAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    perkList = ["xMARANAdvancedMissilecraft1"];
    ingredientList["IngotIron", "IngotSteel"];
    let barbedAmmo = makeBarbedAmmo(ammoIn, patchFile, type, mat);
    makeAmmoRecipeVariants(ammoIn, barbedAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    perkList = ["xMAALCAdvancedExplosives"];
    ingredientList = ["Ale", "FireflyThorax", "Charcoal"]
    let timebombAmmo = makeTimebombAmmo(ammoIn, patchFile, type, mat);
    makeAmmoRecipeVariants(ammoIn, timebombAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    perkList = ["xMASNEThiefsToolbox0"];
    ingredientList = ["FireflyThorax", "LeatherStrips"];
    let lightsourceAmmo = makeLightsourceAmmo(ammoIn, patchFile, type, mat);
    if (type == "Standard Bolt") {

      //Additional variants for bolts
      perkList = ["xMARANAdvancedMissilecraft0"];
      ingredientList = ["IngotIron"];
      let strongAmmo = makeStrongAmmo(ammoIn, patchFile, type, mat);
      makeAmmoRecipeVariants(ammoIn, strongAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMARANAdvancedMissilecraft0"];
      ingredientList = ["IngotSteel"];
      let strongestAmmo = makeStrongestAmmo(ammoIn, patchFile, type, mat);
      makeAmmoRecipeVariants(ammoIn, strongestAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMAALCPoisonBurst"];
      ingredientList = ["deathBell"];
      //Making variants for strong bolts.
      let strongPoisonAmmo = makePoisonAmmo(strongAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongAmmo, strongPoisonAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMAALCElementalBombard"];
      ingredientList = ["FireSalts"];
      let strongFireAmmo = makeFireAmmo(strongAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongAmmo, strongFireAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      ingredientList = ["FrostSalts"];
      let strongFrostAmmo = makeFrostAmmo(strongAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongAmmo, strongFrostAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      ingredientList = ["VoidSalts"];
      let strongShockAmmo = makeShockAmmo(strongAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongAmmo, strongShockAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMAALCFuse"];
      ingredientList = ["FireflyThorax", "Ale"];
      let strongExplosiveAmmo = makeExplosiveAmmo(strongAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongAmmo, strongExplosiveAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMARANAdvancedMissilecraft1"];
      ingredientList["IngotIron", "IngotSteel"];
      let strongBarbedAmmo = makeBarbedAmmo(strongAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongAmmo, strongBarbedAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMAALCAdvancedExplosives"];
      ingredientList = ["Ale", "FireflyThorax", "Charcoal"]
      let strongTimebombAmmo = makeTimebombAmmo(strongAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongAmmo, strongTimebombAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      let strongLightsourceAmmo = makeLightsourceAmmo(strongAmmo, patchFile, type, mat);
      perkList = ["xMASNEThiefsToolbox0"];
      ingredientList = ["FireflyThorax", "LeatherStrips"];
      makeAmmoRecipeVariants(strongAmmo, strongLightsourceAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);

      //Making variants for strongestest bolts.
      let strongestPoisonAmmo = makePoisonAmmo(strongestAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongestAmmo, strongestPoisonAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMAALCElementalBombard"];
      ingredientList = ["FireSalts"];
      let strongestFireAmmo = makeFireAmmo(strongestAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongestAmmo, strongestFireAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      ingredientList = ["FrostSalts"];
      let strongestFrostAmmo = makeFrostAmmo(strongestAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongestAmmo, strongestFrostAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      ingredientList = ["VoidSalts"];
      let strongestShockAmmo = makeShockAmmo(strongestAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongestAmmo, strongestShockAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMAALCFuse"];
      ingredientList = ["FireflyThorax", "Ale"];
      let strongestExplosiveAmmo = makeExplosiveAmmo(strongestAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongestAmmo, strongestExplosiveAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMARANAdvancedMissilecraft1"];
      ingredientList["IngotIron", "IngotSteel"];
      let strongestBarbedAmmo = makeBarbedAmmo(strongestAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongestAmmo, strongestBarbedAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      perkList = ["xMAALCAdvancedExplosives"];
      ingredientList = ["Ale", "FireflyThorax", "Charcoal"]
      let strongestTimebombAmmo = makeTimebombAmmo(strongestAmmo, patchFile, type, mat);
      makeAmmoRecipeVariants(strongestAmmo, strongestTimebombAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
      let strongestLightsourceAmmo = makeLightsourceAmmo(strongestAmmo, patchFile, type, mat);
      perkList = ["xMASNEThiefsToolbox0"];
      ingredientList = ["FireflyThorax", "LeatherStrips"];
      makeAmmoRecipeVariants(strongestAmmo, strongestLightsourceAmmo, ingredientList, perkList, "CraftingSmithingForge", patchFile);
    }
  }
  function makeAmmoRecipeVariants(base, product, ingredients, perks, station, patchFile) {
    let perkList = perks;
    makeAmmoRecipe(base, product, 20, 10, ingredients, perks, "xMAALCSkilledEnhancer0", station, patchFile);
    perkList.push("xMAALCSkilledEnhancer0");
    makeAmmoRecipe(base, product, 20, 12, ingredients, perks, "xMAALCSkilledEnhancer1", station, patchFile);
    perkList.push("xMAALCSkilledEnhancer1");
    makeAmmoRecipe(base, product, 20, 14, ingredients, perks, null, station, patchFile);
  }
  function makeAmmoRecipe (base, product, numIn, numOut, ingredients, perks, blocker, station, patchFile) {
   let recipeID = xelib.EditorID(product) + "CRAFT";
    if (blocker == "xMAALCSkilledEnhancer0") {
      recipeID += "Base";
    }
    else if(blocker == "xMAALCSkilledEnhancer1") {
     recipeID += "01";
    }
    else if(blocker == null) {
      recipeID += "02";
    }
    let recipeRef = xelib.AddElement(patchFile, "COBJ\\COBJ");
    xelib.AddElementValue(recipeRef, "EDID", recipeID);
    xelib.AddElementValue(recipeRef, "BNAM", station);
    xelib.AddElementValue(recipeRef, "CNAM", xelib.EditorID(product));
    xelib.AddElementValue(recipeRef, "NAM1", "" + numOut);
    perks.forEach(perk => addHasPerk(recipeRef, perk));
    if (blocker != null) addBlockerPerk(recipeRef, blocker);
    addRecipeMinimum(recipeRef, xelib.EditorID(base));
    addRecipeIngredient(recipeRef, xelib.EditorID(base), "" + numIn);
    ingredients.forEach(ingredient => addRecipeIngredient(recipeRef, ingredient, "1"));
  }
  function makeStrongAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Strong);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Strong);
    if (!isAmmoPatched) { 
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord) + activeStrings.Ammo.Strong);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Strong);
      patchDamage(newRecord, type, mat, "Strong");
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj) + activeStrings.Ammo.Strong);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Strong);
      patchProj(newProj, type, mat, "Strong", patchFile);
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ");
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeStrongestAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    if (!xelib.EditorID(newRecord).includes("PaMa_")) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord) + activeStrings.Ammo.Strongest);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Strongest);
      patchDamage(newRecord, type, mat, "Strongest");
      safeCache(newRecord, helpers);
    }
    if (!xelib.EditorID(newProj).includes("PaMa_")) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj) + activeStrings.Ammo.Strongest);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Strongest);
      patchProj(newProj, type, mat, "Strongest", patchFile);
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord
  }
  function makePoisonAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Poisoned);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Poisoned);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Poisoned);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Poisoned);
      patchDamage(newRecord, type, mat, "Poisoned");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.PoisonDesc);
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Poisoned);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Poisoned);
      patchProj(newProj, type, mat, "Poisoned", patchFile);
      xelib.SetFlag(newProj, "DATA\\Flags", "Explosion", true);
      xelib.SetFlag(newProj, "DATA\\Flags", "Alt. Trigger", false);
      xelib.AddElementValue(newProj, "DATA\\Explosion", "xMAALCPoisonBurstAmmoPoisonExplosion");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeFireAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Fire);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Fire);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Fire);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Fire);
      patchDamage(newRecord, type, mat, "Fire");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.FireDesc);
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Fire);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Fire);
      patchProj(newProj, type, mat, "Fire", patchFile);
      xelib.SetFlag(newProj, "DATA\\Flags", "Explosion", true);
      xelib.SetFlag(newProj, "DATA\\Flags", "Alt. Trigger", false);
      xelib.AddElementValue(newProj, "DATA\\Explosion", "xMAALCElementalBurstExplosionFire");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeFrostAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Frost);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Frost);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Frost);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Frost);
      patchDamage(newRecord, type, mat, "Frost");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.FrostDesc)
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Frost);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Frost);
      patchProj(newProj, type, mat, "Frost", patchFile);
      xelib.SetFlag(newProj, "DATA\\Flags", "Explosion", true);
      xelib.SetFlag(newProj, "DATA\\Flags", "Alt. Trigger", false);
      xelib.AddElementValue(newProj, "DATA\\Explosion", "xMAALCElementalBurstExplosionFrost");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeShockAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Shock);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Shock);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Shock);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Shock);
      patchDamage(newRecord, type, mat, "Shock");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.ShockDesc)
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Shock);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Shock);
      patchProj(newProj, type, mat, "Shock", patchFile);
      xelib.SetFlag(newProj, "DATA\\Flags", "Explosion", true);
      xelib.SetFlag(newProj, "DATA\\Flags", "Alt. Trigger", false);
      xelib.AddElementValue(newProj, "DATA\\Explosion", "xMAALCElementalBurstExplosionShock");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeExplosiveAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Explosive);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Explosive);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Explosive);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Explosive);
      patchDamage(newRecord, type, mat, "Explosive");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.ExplosiveDesc)
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Explosive);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Explosive);
      patchProj(newProj, type, mat, "Explosive", patchFile);
      xelib.SetFlag(newProj, "DATA\\Flags", "Explosion", true);
      xelib.SetFlag(newProj, "DATA\\Flags", "Alt. Trigger", false);
      xelib.AddElementValue(newProj, "DATA\\Explosion", "xMAALCFuseExplosion");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeBarbedAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Barbed);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Barbed);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Barbed);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Barbed);
      patchDamage(newRecord, type, mat, "Barbed");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.BarbedDesc)
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Barbed);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Barbed);
      patchProj(newProj, type, mat, "Barbed", patchFile);
      xelib.SetFlag(newProj, "DATA\\Flags", "Explosion", true);
      xelib.SetFlag(newProj, "DATA\\Flags", "Alt. Trigger", false);
      xelib.AddElementValue(newProj, "DATA\\Explosion", "xMARANAdvancedMissilecraft1BarbedExplosion");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeTimebombAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Timebomb);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Timebomb);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Timebomb);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Timebomb);
      patchDamage(newRecord, type, mat, "Timebomb");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.TimebombDesc)
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Timebomb);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Timebomb);
      patchProj(newProj, type, mat, "Timebomb", patchFile);
      xelib.SetFlag(newProj, "DATA\\Flags", "Explosion", true);
      xelib.SetFlag(newProj, "DATA\\Flags", "Alt. Trigger", true);
      xelib.SetFloatValue(newProj, "DATA\\Explosion - Alt. Trigger - Timer", 4.0);
      xelib.AddElementValue(newProj, "DATA\\Explosion", "xMAALCAdvancedExplosivesMissileExplosion");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function makeLightsourceAmmo(ammoIn, patchFile, type, mat) {
    let newRecord = xelib.CopyElement(ammoIn, patchFile, true);
    let newProj = xelib.CopyElement(getWinningLink(ammoIn, "DATA\\Projectile"), patchFile, true);
    let isAmmoPatched = xelib.EditorID(newRecord).includes("PaMa_") && xelib.EditorID(newRecord).includes(activeStrings.Ammo.Lightsource);
    let isProjPatched = xelib.EditorID(newProj).includes("PaMa_") && xelib.EditorID(newProj).includes(activeStrings.Ammo.Lightsource);
    if (!isAmmoPatched) {
      xelib.SetValue(newRecord, "EDID", "PaMa_" + xelib.EditorID(newRecord).replace("PaMa_","") + activeStrings.Ammo.Lightsource);
      xelib.SetValue(newRecord, "FULL", xelib.FullName(newRecord) + " - " + activeStrings.Ammo.Lightsource);
      patchDamage(newRecord, type, mat, "Lightsource");
      xelib.SetValue(newRecord, "DESC", activeStrings.Ammo.LightsourceDesc)
      safeCache(newRecord, helpers);
    }
    if (!isProjPatched) {
      xelib.SetValue(newProj, "EDID", "PaMa_" + xelib.EditorID(newProj).replace("PaMa_","") + activeStrings.Ammo.Lightsource);
      xelib.SetValue(newProj, "FULL", xelib.FullName(newProj) + " - " + activeStrings.Ammo.Lightsource);
      patchProj(newProj, type, mat, "Lightsource", patchFile);
      xelib.AddElementValue(newProj, "DATA\\Light", "xMASNEThiefsToolboxLightsourceArrowLight");
      if (xelib.EditorID(newRecord) == xelib.EditorID(newProj)) xelib.SetValue(newProj, "EDID", xelib.EditorID(newProj) + "PROJ")
      safeCache(newProj, helpers);
    }
    return newRecord;
  }
  function patchDamage(ammoIn, type, mat, mod) {
    let oldDamage = xelib.GetFloatValue(ammoIn, "DATA\\Damage");
    let newDamage = ammoTypes[type].damageBase;
    if (mat != "") {
      newDamage += ammoMats[mat].damageMod;
    }
    if (mod != "") {
      newDamage += ammoMods[mod].damageMod;
    }
  }
  function patchProj(projIn, type, mat, mod, patchFile) {
    if (projIn == "") {
      helpers.logMessage("Ammo patcher error: Projectile for " + xelib.FullName(ammoIn) + " doesn't exist.");
      return;
    }
    let oldRange = xelib.GetFloatValue(projIn, "DATA\\Range");
    let oldSpeed = xelib.GetFloatValue(projIn, "DATA\\Speed");
    let oldGravity = xelib.GetFloatValue(projIn, "DATA\\Gravity");
    let newRange = ammoTypes[type].rangeBase;
    let newSpeed = ammoTypes[type].speedBase;
    let newGravity = ammoTypes[type].gravityBase;
    if (mat != "") {
      newRange += ammoMats[mat].rangeMod;
      newSpeed += ammoMats[mat].speedMod;
      newGravity += ammoMats[mat].gravityMod;
    }
    if (mod != "") {
      newRange += ammoMods[mod].rangeMod;
      newSpeed += ammoMods[mod].speedMod;
      newGravity += ammoMods[mod].gravityMod;
    }
    if (oldRange != newRange ) {
      xelib.SetFloatValue(projIn, "DATA\\Range", newRange);
    }
    if (oldSpeed != newSpeed) {
      xelib.SetFloatValue(projIn, "DATA\\Speed", newSpeed);
    }
    if (oldGravity != newGravity) {
      xelib.SetFloatValue(projIn, "DATA\\Gravity", newGravity);
    }
  }
  return {
    load: {
      signature: "AMMO",
      filter: ammo => {
        let isPlayable = !xelib.GetRecordFlag(ammo, "Non-Playable");
        let nullName = false;
        let isExcluded = false;
        if (xelib.FullName(ammo) == "") nullName = true;
        for (e = 0; e < ammoExclude['id'].length; e++) {
          if (ammoExclude['id'][e] == xelib.EditorID(ammo)) {
            isExcluded = true
            break
          }
        }
        for (p = 0; p < ammoExclude['idPartials'].length; p++) {
          if (xelib.EditorID(ammo).includes(ammoExclude['idPartials'][p])) {
            isExcluded = true
            break
          }
        }
        return !nullName && isPlayable && !isExcluded;
      }
    }, 
    patch: ammo => {
      let ammoRecord = xelib.GetWinningOverride(ammo);
      let ammoType = "";
      let ammoMat = "";
      Object.keys(ammoMats).forEach(mat => {
        for (m = 0; m < ammoMats[mat].nameBindings.length; m++) {
          if(xelib.FullName(ammoRecord).includes(ammoMats[mat].nameBindings[m])) {
            ammoMat = mat;
            break;
          }
        }
      });
      Object.keys(ammoTypes).forEach(type => {
        for (t = 0; t < ammoTypes[type].nameBindings.length; t++){
          if (xelib.FullName(ammoRecord).includes(ammoTypes[type].nameBindings[t])) {
            ammoType = type;
            break;
          }
        }
      });
      if (ammoType != "" && ammoMats[ammoMat].mult) generateVariants(ammoRecord, patchFile, ammoType, ammoMat);
      if(locals.useWarrior && ammoType != "") {
        let ammoCopy = xelib.CopyElement(ammoRecord, patchFile);
        let projCopy = xelib.CopyElement(getWinningLink(ammoCopy, "DATA\\Projectile"), patchFile);
        let ammoMod = "";
        patchDamage(ammoCopy, ammoType, ammoMat, ammoMod);
        patchProj(projCopy, ammoType, ammoMat, ammoMod);
      }
    }
  }
}
function armorPatcher(patchFile, locals, helpers, settings) {
  function makeClothingExpensive(clothing) {
    if(xelib.GetGoldValue(clothing) > 50 && xelib.HasKeyword(clothing, "ClothingBody")
    && !xelib.HasKeyword(clothing, "ClothingRich")) {
      xelib.AddKeyword(clothing, "ClothingRich");
    }
  }
  function addArmorMeltdownRecipe(armor, mat, patchFile) {
    const materialCommon = fh.loadJsonFile(`${patcherPath}/json/materialCommon.json`);
    const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
    let outputQuantity = 0;
    if (xelib.HasKeyword(armor, "ArmorBoots")) {
      outputQuantity = 1
    }
    else if (xelib.HasKeyword(armor, "ArmorCuirass")) {
      outputQuantity = 2
    }
    else if (xelib.HasKeyword(armor, "ArmorHelmet")) {
      outputQuantity = 1
    }
    else if (xelib.HasKeyword(armor, "ArmorGauntlets")) {
      outputQuantity = 1
    }
    else if (xelib.HasKeyword(armor, "ArmorShield")) {
      outputQuantity = 2
    }
    let armorOutputKey = armorMaterials[mat].meltdownMat;
    let armorOutputMat = materialCommon[armorOutputKey].meltdownID;
    let craftingStation = materialCommon[armorOutputKey].meltdownStation;
    let meltPerk = materialCommon[armorOutputKey].perk
    if (armorMaterials[mat] == "Clothing") {
      armorOutputMat = "LeatherStrips";
      armorOutputKey = "Placeholder";
      craftignStation = "CraftingTanningRack";
    }
    if (armorOutputKey == null || outputQuantity == 0 || craftingStation == null) {
      return;
    }
    let meltRecipe = xelib.AddElement(patchFile, "COBJ\\COBJ");
    xelib.AddElementValue(meltRecipe, "BNAM", craftingStation);
    xelib.AddElementValue(meltRecipe, "EDID", "PaMa_" + xelib.EditorID(armor).replace("PaMa_","") + "BREAKDOWN");
    addRecipeIngredient(meltRecipe, xelib.EditorID(armor), "1");
    xelib.AddElementValue(meltRecipe, "CNAM", armorOutputMat);
    xelib.AddElementValue(meltRecipe, "NAM1", outputQuantity.toString());
    addRecipeMinimum(meltRecipe, xelib.EditorID(armor));
    if (meltPerk != null) addHasPerk(meltRecipe, meltPerk);
    addHasPerk(meltRecipe, "xMASMIMeltdown");
  }
  function addTemperingRecipe(armor, mat, patchFile) {
    const materialCommon = fh.loadJsonFile(`${patcherPath}/json/materialCommon.json`);
    const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
    let temperMat = armorMaterials[mat].temperMat;
    let temperItem = materialCommon[temperMat].temperID;
    let temperStation = "CraftingSmithingArmorTable";
    let temperPerk = materialCommon[temperMat].perk;
    if (temperItem == null) return;
    let temperRecipe = xelib.AddElement(patchFile, "COBJ\\COBJ");
    addHasPerk(temperRecipe, temperPerk);
    addRecipeIngredient(temperRecipe, temperItem, "1");
    xelib.AddElementValue(temperRecipe, "CNAM", xelib.EditorID(armor));
    xelib.AddElementValue(temperRecipe, "BNAM", temperStation);
    xelib.AddElementValue(temperRecipe, "NAM1", "1");
    xelib.AddElementValue(temperRecipe, "EDID", "PaMa_" + xelib.EditorID(armor).replace("PaMa_","") + "TEMPER")
  }
  function addMasqueradeKeyword(armor) {
    const armorFactions = fh.loadJsonFile(`${patcherPath}/json/armor/armorFactions.json`);
    let keywordList = [];
    Object.keys(armorFactions).forEach(key => {
      Object.keys(armorFactions[key].nameBindings).forEach(name => {
        if (xelib.EditorID(armor).includes(armorFactions[key].nameBindings[name])){
          keywordList.push(armorFactions[key].keyword);
        }
      });
    });
    if (keywordList != []) {
      keywordList.forEach(keyword => {
        xelib.AddKeyword(armor, keyword);
      });
    }
  }
  function addSpecificKeywords(armor, material) {
    const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
    if (xelib.HasKeyword(armor, "ArmorLight")) {
      xelib.RemoveKeyword(armor, "ArmorLight");
    }
    if (xelib.HasKeyword(armor, "ArmorHeavy")) {
      xelib.RemoveKeyword(armor, "ArmorHeavy");
    }
    let newMaterial = armorMaterials[material];
    if (newMaterial.type == "Light") {
      xelib.AddKeyword(armor, "ArmorLight");
      xelib.SetArmorType(armor, "Light");
    }
    else if(newMaterial.type == "Heavy") {
      xelib.AddKeyword("ArmorHeavy");
      xelib.SetArmorType(armor, "Heavy");
    }
    else if(newMaterial.type == "Both") {
      xelib.AddKeyword("ArmorHeavy");
      xelib.AddKeyword("ArmorLight");
    }
    else if (newMaterial.type == "Clothing") {
      return;
    }
    else {
      return;
    }
    let armorType = xelib.GetArmorType(armor);
    if (xelib.HasKeyword(armor, "ArmorBoots")) {
      if (armorType == "Light") {
        xelib.AddKeyword(armor, "xMAArmorLightLegs");
      }
      else if (armorType == "Heavy") {
        xelib.AddKeyword(armor, "xMAArmorHeavyLegs");
      }
    }
    else if (xelib.HasKeyword(armor, "ArmorCuirass")) {
      if (armorType == "Light") {
        xelib.AddKeyword(armor, "xMAArmorLightChest");
      }
      else if(armorType == "Heavy") {
        xelib.AddKeyword(armor, "xMAArmorHeavyChest");
      }
    }
    else if (xelib.HasKeyword(armor, "ArmorGauntlets")) {
      if (armorType == "Light") {
        xelib.AddKeyword(armor, "xMAArmorLightArms");
      }
      else if(armorType == "Hevay") {
        xelib.AddKeyword(armor, "xMAArmorHeavyArms");
      }
    }
    else if (xelib.HasKeyword(armor, "ArmorHelmet")) {
      if (armorType == "Light") {
        xelib.AddKeyword(armor, "xMAArmorLightHead");
      }
      else if(xelib.GetArmorType(armor) == "Heavy") {
        xelib.AddKeyword(armor, "xMAArmorHeavyHead");
      }
    }
    else if (xelib.HasKeyword(armor, "ArmorShield")) {
      if (armorType == "Light") {
        xelib.AddKeyword(armor, "xMAAArmorLightShield");
      }
      else if (armorType == "Heavy") {
        xelib.AddKeyword(armor, "xMAArmorHeavyShield");
      }
    }
  }
  function setArmorValue(armor, mat) {
    const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
    let originalRating = xelib.GetArmorRating(armor);
    let newRating = armorMaterials[mat].armorBase * 100;
    if (xelib.HasKeyword(armor, "ArmorBoots")) {
      newRating *= settings.defaultsettings.gamesettings.fArmorFactorFeet;
    }
    else if (xelib.HasKeyword(armor, "ArmorCuirass")) {
      newRating *= settings.defaultsettings.gamesettings.fArmorFactorBody;
    }
    else if (xelib.HasKeyword(armor, "ArmorGauntlets")) {
      newRating *= settings.defaultsettings.gamesettings.fArmorFactorHands;
    }
    else if (xelib.HasKeyword(armor, "ArmorHelmet")) {
      newRating *= settings.defaultsettings.gamesettings.fArmorFactorHead;
    }
    if (originalRating != newRating && newRating != 0) {
      xelib.SetArmorRating(armor, newRating);
      return;
    }
  }
  function makeReforgedArmor(armor, mat, patchFile) {
    const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    let reforgeVariant = xelib.CopyElement(armor, patchFile);
    let reforgeID = "PaMa_" + xelib.EditorID(armor).replace("PaMa_","") + activeStrings.Reforged;
    let reforgeName = activeStrings.Reforged + " " + xelib.FullName(armor);
    xelib.AddElementValue(armor, "EDID", reforgeID);
    xelib.AddElementValue(armor, "FULL", reforgeName);
    return reforgeVariant;
  }
  function makeWarforgedArmor(armor, mat, patchFile) {
    const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    let warforgeVariant = xelib.CopyElement(armor, patchFile);
    let warforgeID = "PaMa_" + xelib.EditorID(armor).replace("PaMa_","").replace(activeStrings.Reforged, "") + activeStrings.Warforged;
    let warforgeName = activeStrings.Warforged + " " + xelib.FullName(armor).replace(activeStrings.Reforged, "");
    xelib.AddElementValue(armor, "EDID", warforgeID);
    xelib.AddElementValue(armor, "FULL", warforgeName);
    xelib.AddKeyword(armor, "xMASMIWarforgedArmorKW");
    xelib.AddKeyword(armor, "MagicDisallowEnchanting");
    return warforgeVariant;
  }
  function makeCopycatArmor(armor, patchFile) {
    const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    let replicaArmor = xelib.CopyElement(armor, patchFile);
    xelib.SetValue(armor, "FULL", xelib.FullName(armor) + " [" + activeStrings.Replica + "]")
    xelib.SetValue(armor, "EDID", "PaMa_" + xelib.EditorID(armor).replace("PaMa_","") + activeStrings.Replica);
    xelib.RemoveElement(armor, "EITM");
    applyArmorModifiers(armor);
    return replicaArmor;
  }
  function makeReforgedRecipe(newArmor, oldArmor, mat, patchFile) {
    const materialCommon = fh.loadJsonFile(`${patcherPath}/json/materialCommon.json`);
    const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
    const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    let reforgeRecipe = xelib.AddElement(patchFile, "COBJ\\COBJ");
    let reforgeItem = materialCommon[armorMaterials[mat].temperMat].temperID;
    let reforgePerk = materialCommon[armorMaterials[mat].temperMat].perk;
    xelib.AddElementValue(reforgeRecipe, "BNAM", "CraftingSmithingForge");
    xelib.AddElementValue(reforgeRecipe, "CNAM", xelib.EditorID(newArmor));
    xelib.AddElementValue(reforgeRecipe, "EDID", "PaMa_" + xelib.EditorID(oldArmor).replace("PaMa_","").replace(activeStrings.Reforged, "") + activeStrings.Reforged);
    if (reforgeItem != null) addRecipeIngredient(reforgeRecipe, reforgeItem, "2");
    addRecipeIngredient(reforgeRecipe, xelib.EditorID(oldArmor), "1");
    addRecipeMinimum(reforgeRecipe, xelib.EditorID(oldArmor));
    addHasPerk(reforgeRecipe, reforgePerk);
    addHasPerk(reforgeRecipe, "xMASMIArmorer");
    return reforgeRecipe;
  }
  function makeWarforgedRecipe(newArmor, oldArmor, mat, patchFile) {
    const materialCommon = fh.loadJsonFile(`${patcherPath}/json/materialCommon.json`);
    const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
    const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    let warforgeRecipe = xelib.AddElement(patchFile, "COBJ\\COBJ");
    let warforgeItem = materialCommon[armorMaterials[mat].temperMat].temperID;
    let warforgePerk = materialCommon[armorMaterials[mat].temperMat].perk;
    xelib.AddElementValue(warforgeRecipe, "BNAM", "CraftingSmithingForge");
    xelib.AddElementValue(warforgeRecipe, "CNAM", xelib.EditorID(newArmor));
    xelib.AddElementValue(warforgeRecipe, "EDID", "PaMa_" + xelib.EditorID(oldArmor).replace(activeStrings.Reforged, "").replace("PaMa_","").replace(activeStrings.Warforged, "") + activeStrings.Warforged);
    if (warforgeItem != null) addRecipeIngredient(warforgeRecipe, warforgeItem, "5");
    addRecipeIngredient(warforgeRecipe, xelib.EditorID(oldArmor), "1");
    addRecipeMinimum(warforgeRecipe, xelib.EditorID(oldArmor));
    addHasPerk(warforgeRecipe, warforgePerk);
    addHasPerk(warforgeRecipe, "xMASMIMasteryWarforged");
    return warforgeRecipe;
  }
  function makeCopycatRecipe(armor, source, mat, patchFile) {
    const materialCommon = fh.loadJsonFile(`${patcherPath}/json/materialCommon.json`);
    const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
    let copyRecipe = xelib.AddElement(patchFile, "COBJ\\COBJ");
    let copyItem = materialCommon[armorMaterials[mat].temperMat].temperID;
    let copyPerk = materialCommon[armorMaterials[mat].temperMat].perk;
    xelib.AddElementValue(copyRecipe, "BNAM", "CraftingSmithingForge");
    xelib.AddElementValue(copyRecipe, "CNAM", xelib.EditorID(armor));
    xelib.AddElementValue(copyRecipe, "EDID", "PaMa_" + xelib.EditorID(source).replace("PaMa_","") + "Craft")
    if (copyItem != null) addRecipeIngredient(copyRecipe, copyItem, "3");
    addRecipeIngredient(copyRecipe, "xMASMICopycatArtifactEssence", "1");
    addHasPerk(copyRecipe, "xMASMICopycat");
    addHasPerk(copyRecipe, copyPerk);
    addRecipeMinimum(copyRecipe, xelib.EditorID(source));
    return copyRecipe;
  }
  function makeReplicaRecords(armor, mat, patchFile) {
    if (!xelib.HasKeyword(armor, "DaedricArtifact")) {
      return;
    }
    let newArmor = makeCopycatArmor(armor, patchFile);
    let newRecipe = makeCopycatRecipe(newArmor, armor, mat, patchFile);
    if (newArmor == null || newRecipe == null) return;
    if (locals.useWarrior && xelib.GetArmorType(armor) != "Clothing" && !xelib.HasKeyword(armor, "ArmorJewelry")) {
      addArmorMeltdownRecipe(newArmor, mat, patchFile);
      let copyReforged = makeReforgedArmor(newArmor, mat, patchFile);
      makeReforgedRecipe(copyReforged, newArmor, mat, patchFile);
      addArmorMeltdownRecipe(copyReforged, mat, patchFile);
      let copyWarforged = makeWarforgedArmor(newArmor, mat, patchFile);
      makeWarforgedRecipe(copyWarforged, copyReforged, mat, patchFile);
      addArmorMeltdownRecipe(copyWarforged, mat, patchFile);
    }
  }
  function makeQualityLeather(armor, mat, patchFile) {
    if (!xelib.HasKeyword(armor, "ArmorMaterialLeather")) return;
    let leatherRecipes = getArmorRecipes(armor);
    if (leatherRecipes.length == 0) return;
    let qualityArmor = createQualityLeatherVariant(armor, patchFile);
  }
  function getArmorRecipes(armor) {
    let sourceFile = xelib.GetElementFile(armor);
    let recipeList = xelib.GetElements(sourceFile, "COBJ");
    let recipeReturn = [];
    recipeList.forEach(recipe => {
      if (xelib.GetElement(recipe, "CNAM") == xelib.EditorID(armor)) {
        recipeReturn.push(recipe);
      }
    });
    return recipeReturn;
  }
  function getArmorTemperRecipes(armor) {
    let sourceFile = xelib.GetElementFile(armor);
    let recipeList = xelib.GetElements(sourceFile, "COBJ");
    let recipeReturn = [];
    recipeList.forEach(recipe => {
      if (xelib.GetElement(recipe, "CNAM") == xelib.EditorID(armor) 
      && xelib.GetElement("BNAM") == "CraftingSmithingArmorTable") {
        recipeReturn.push(recipe);
      }
    });
    return recipeReturn;
  }
  function createQualityLeatherVariant(armor, patchFile) {
    const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    let leatherVariant = xelib.CopyElement(armor, patchFile);
    xelib.AddElementValue(leatherVariant, "EDID", "PaMa_" + xelib.EditorID(armor).replace("PaMa_","") + activeStrings.Quality);
    xelib.AddElementValue(leatherVariant, "FULL", xelib.FullName(armor) + " [" + activeStrings.Quality + "]")
    applyArmorModifiers(leatherVariant);
    return leatherVariant;
  }
  function createQualityLeatherRecipe(armor, recipes, patchFile) {
    const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
    recipes.forEach(craft => {
      let qualityRecipe = xelib.CopyElement(craft, patchFile);
      xelib.AddElementValue(qualityRecipe, "EDID", "PaMa_" + xelib.EditorID(armor) + activeStrings.Quality);
      xelib.AddElementValue(qualityRecipe, "CNAM", xelib.EditorID(armor));
      let needsLeather = false;
      let needsLeatherStrips = false;
      let ingredientList = xelib.GetElements(craft, "Items");
      ingredientList.forEach(ingred => {
        if (xelib.EditorID(xelib.GetElement(ingred, "Item\\CNTO\\Item")) == "Leather01") needsLeather = true;
        else if (xelib.EditorID(xelib.GetElement(ingred, "Item\\CNTO\\Item")) == "LeatherStrips") needsLeatherStrips = true;
      });
      xelib.RemoveElement(qualityRecipe, "Conditions");
      addHasPerk(qualityRecipe, "xMASMIMaterialLeather");
      if (needsLeather) addRecipeIngredient(qualityRecipe, "xMAWAYQualityLeather");
      if (needsLeatherStrips) addRecipeIngredient(qualityRecipe, "xMAWAYQualityLeatherStrips");
    });
  }
  function applyArmorModifiers(armor) {
    const armorModifiers = fh.loadJsonFile(`${patcherPath}/json/armor/armorModifiers.json`);
    let armorMods = getArmorModifiers(armor);
    if (armorMods == []) return;
    armorMods.forEach(mod => {
      xelib.SetWeight(armor, xelib.GetWeight(armor) * armorModifiers[mod].factorWeight);
      xelib.SetArmorRating(armor, xelib.GetArmorRating(armor) * armorModifiers[mod].factorArmor);
      xelib.SetGoldValue(armor, xelib.GetArmorRating(armor) * armorModifiers[mod].factorValue);
    });
  }
  function getArmorModifiers(armor) {
    const armorModifiers = fh.loadJsonFile(`${patcherPath}/json/armor/armorModifiers.json`);
    let returnList = [];
    Object.keys(armorModifiers).forEach(mod => {
      Object.keys(armorModifiers[mod].nameBindings).forEach(binding => {
        if (xelib.FullName(armor).includes(binding)) returnList.push(mod);
      });
    });
    return returnList;
  }
  function isArmorReforgeExcluded(armor) {
    const armorReforgeExclusions = fh.loadJsonFile(`${patcherPath}/json/armor/reforgeExclusions.json`);
    let isExcluded = false;
    armorReforgeExclusions['ids'].forEach(id => {
      if (xelib.EditorID(armor) == id) isExcluded = true;
    });
    armorReforgeExclusions['idPrefixes'].forEach(idPrefix => {
      if (xelib.EditorID(armor).indexOf(idPrefix) == 0) isExcluded = true;
    });
    armorReforgeExclusions['idPartials'].forEach(partial => {
      if (xelib.EditorID(armor).includes(partial)) isExcluded = true;
    });
    armorReforgeExclusions['names'].forEach(name => {
      if(xelib.FullName(armor) == name) isExcluded = true;
    });
    armorReforgeExclusions['namePrefixes'].forEach(namePrefix => {
      if(xelib.FullName(armor).indexOf(namePrefix) == 0) isExcluded = true;
    });
    armorReforgeExclusions['namePartials'].forEach(namePart => {
      if(xelib.FullName(armor).includes(namePart)) isExcluded = true;
    });
    return isExcluded;
  }
  function useListEnchantmentBindings() {
    
  }
  function useDirectEnchantmentBindings() {
    
  }
  return {
    load: {
      signature: "ARMO",
      filter: armo => {
        const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
        let patchMaterial = "";
        Object.keys(armorMaterials).forEach(armorMat => {
          for (a = 0; a < armorMaterials[armorMat].nameBindings.length; a++) {
            if (xelib.EditorID(armo).includes(armorMaterials[armorMat].nameBindings[a])) {
              patchMaterial = armorMat;
              break
            }
          }
        });
        let armorPlayable = !xelib.GetRecordFlag(armo, "Non-Playable");
        let hasTemplate = xelib.GetElement(armo, "TNAM");
        let isJewelry = xelib.HasKeyword(armo, "ArmorJewelry");
        let hasMaterial = false;
        if (patchMaterial != "") hasMaterial = true;
        return armorPlayable && !hasTemplate && !isJewelry && hasMaterial;
      }
    },
    patch: armo => {
      const activeStrings = fh.loadJsonFile(`${patcherPath}/json/lang/strings_en.json`);
      const materialCommon = fh.loadJsonFile(`${patcherPath}/json/materialCommon.json`);
      const armorMaterials = fh.loadJsonFile(`${patcherPath}/json/armor/armorMaterials.json`);
      const armorModifiers = fh.loadJsonFile(`${patcherPath}/json/armor/armorModifiers.json`);
      const armorReforgeExclusions = fh.loadJsonFile(`${patcherPath}/json/armor/reforgeExclusions.json`);
      let patchMat = "None";
      Object.keys(armorMaterials).forEach(armorMat => {
        for (m = 0; m < armorMaterials[armorMat].nameBindings.length; m++){
          if(xelib.EditorID(armo).includes(armorMaterials[armorMat].nameBindings[m])) {
            patchMat = armorMat;
            break
          }
        }
      });
      let armorType = xelib.GetArmorType(armo);
      let patchArmor = xelib.CopyElement(armo, patchFile);
      let reforgeVariant = null;
      let warforgeVariant = null;
      if (locals.useWarrior) {
        if (!isArmorReforgeExcluded(patchArmor)) addArmorMeltdownRecipe(patchArmor, patchMat, patchFile);
        if (!isArmorReforgeExcluded(patchArmor) && !xelib.HasKeyword(patchArmor, "ArmorJewelry") && xelib.GetArmorType(patchArmor) != "Clothing") {
          reforgeVariant = makeReforgedArmor(patchArmor, patchMat, patchFile);
          applyArmorModifiers(reforgeVariant);
          addTemperingRecipe(reforgeVariant, patchMat, patchFile);
          makeReforgedRecipe(reforgeVariant, patchArmor, patchMat, patchFile);
          addArmorMeltdownRecipe(reforgeVariant, patchMat, patchFile);

          warforgeVariant = makeWarforgedArmor(patchArmor, patchMat, patchFile);
          applyArmorModifiers(warforgeVariant);
          addTemperingRecipe(warforgeVariant, patchMat, patchFile);
          makeWarforgedRecipe(warforgeVariant, reforgeVariant, patchMat, patchFile);
          addArmorMeltdownRecipe(warforgeVariant, patchMat, patchFile);
        }
        makeReplicaRecords(patchArmor, patchMat, patchFile);
        applyArmorModifiers(patchArmor);
      }
      if (locals.useThief) {
        makeClothingExpensive(patchArmor);
        addMasqueradeKeyword(patchArmor);
        makeQualityLeather(patchArmor, patchMat, patchFile);
      }
    }
  }
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
        fProtectionPerArmor: 0.1,
        fMaxProtection: 90.0,
        fArmorRatingMax: 1.75,
        fArmorRatingPCMax: 1.4,
        fArmorFactorBody: 3.9,
        fArmorFactorFeet: 1.4,
        fArmorFactorHands: 1.4,
        fArmorFactorHead: 1.9,
        fArmorFactorShield: 2.4,
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
      //alchemyPatcher(locals, patchFile),
      //ingredientPatcher(locals, patchFile),
      //ammoPatcher(locals, patchFile, helpers),
      armorPatcher(patchFile, locals, helpers, settings),
    ],
  })
});