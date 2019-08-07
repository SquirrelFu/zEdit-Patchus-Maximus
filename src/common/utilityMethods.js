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