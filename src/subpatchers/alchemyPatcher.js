function alchemyPatcher(helpers, locals) {
  return {
    load: {
      signature: 'ALCH',
      filter: function (alch){
        if (isPotionExcluded(xelib.EditorID(alch)) || xelib.GetFlag(alch, 'ENIT\\Flags', "Food Item")) {
          return false;
        }
        return true;
      }
    },
    patch: alch => {
      removeMagicSchool(xelib.GetEffect(alch));
    },
  }
}