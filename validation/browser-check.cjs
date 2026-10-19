const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});const results=[];
 for(const route of ['/','/landing.html','/components'])for(const width of [320,390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto('http://127.0.0.1:4184'+route,{waitUntil:'networkidle'});
  const geometry=await page.evaluate(()=>({title:document.title,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,text:document.body.innerText.slice(0,250)}));
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const identityMatches=geometry.text.includes(route==='/components'?'Shadcn/ui Component Library':'AION');
  results.push({route,width,status:response.status(),identityMatches,passed:response.status()===200&&identityMatches&&errors.length===0&&geometry.scrollWidth<=width&&axe.violations.length===0,contentType:response.headers()['content-type'],errors,...geometry,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
  if(route==='/'&&width===390)await page.screenshot({path:'validation/evidence/aion-mobile.png',fullPage:true});
  await context.close();
 }
 await browser.close();fs.writeFileSync('validation/evidence/aion-browser.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(r=>({route:r.route,width:r.width,passed:r.passed,overflow:r.scrollWidth>r.width,errors:r.errors,violations:r.violations.map(v=>v.id)}))));
 process.exitCode=results.every(r=>r.passed)?0:1;
})().catch(e=>{console.error(e.message);process.exit(1)});
