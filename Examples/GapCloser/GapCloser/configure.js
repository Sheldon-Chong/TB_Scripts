function configure(packageFolder, packageName)
{
  if (about.isPaintMode())
    return;

   require("./index.js").registerTool(packageFolder);
}

exports.configure = configure;
