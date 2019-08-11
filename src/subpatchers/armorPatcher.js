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