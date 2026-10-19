import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const missing = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
for (const file of ['client','server','shared','api'].flatMap(d=>walk(path.join(root,d))).filter(p=>/\.[cm]?[jt]sx?$/.test(p))) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true);
  function inspect(node) {
    let spec;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) spec=node.moduleSpecifier.text;
    if (ts.isCallExpression(node) && node.expression.kind===ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) spec=node.arguments[0].text;
    if (spec) {
      let base;
      if(spec.startsWith('.')) base=path.resolve(path.dirname(file),spec);
      else if(spec.startsWith('@/')) base=path.join(root,'client/src',spec.slice(2));
      else if(spec.startsWith('@shared/')) base=path.join(root,'shared',spec.slice(8));
      else if(spec.startsWith('@assets/')) base=path.join(root,'attached_assets',spec.slice(8));
      if(base) {
        const options=[base,...['.ts','.tsx','.js','.jsx','.json'].map(ext=>base+ext),...['.ts','.tsx','.js'].map(ext=>path.join(base,'index'+ext))];
        if(!options.some(p=>fs.existsSync(p)&&fs.statSync(p).isFile())) missing.push({source:path.relative(root,file),import:spec});
      }
    }
    ts.forEachChild(node,inspect);
  }
  inspect(ast);
}
for (const entry of ['client/index.html','server/_core/index.ts','api/index.ts']) if(!fs.existsSync(path.join(root,entry))) missing.push({source:'deployment contract',import:entry});
console.log(JSON.stringify({passed:missing.length===0,missing_local_dependencies:missing},null,2));
process.exitCode=missing.length?1:0;
