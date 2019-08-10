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