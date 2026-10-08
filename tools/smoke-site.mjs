// Visual/browser QA. Install playwright-core or set PLAYWRIGHT_MODULE to its
// entry file; CHROME_PATH selects an installed Chrome. No browser download.
// Optional SITE_URL tests deployment instead of the local docs tree.
// Optional QA_OUTPUT saves screenshots (keep these outside the repository).
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../docs');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.woff2':'font/woff2'};
let server,browser;
try {
  let url=process.env.SITE_URL;
  if(!url){
    server=http.createServer((req,res)=>{
      let file;
      try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
      if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
      const size=fs.statSync(file).size,range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
      const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),size-1):size-1;
      if(start>end){res.writeHead(416).end();return;}
      res.writeHead(range?206:200,{'content-type':types[path.extname(file)]??'application/octet-stream','content-length':end-start+1,'accept-ranges':'bytes',...(range?{'content-range':`bytes ${start}-${end}/${size}`}:{})});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    url=`http://127.0.0.1:${server.address().port}/`;
  }
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
  for(const width of [1440,768,390]){
    const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
    // Do not contaminate audience analytics with QA traffic; consent stays unset.
    await context.route('https://get.neuro-cause.com/collect',r=>r.fulfill({status:204}));
    const page=await context.newPage(),errors=[],clarity=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('clarity.ms'))clarity.push(r.url());});
    const response=await page.goto(url,{waitUntil:'load',timeout:60000});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>document.querySelector('[data-hero]')?.currentTime>0.2,{},{timeout:20000});
    const t0=await page.locator('[data-hero]').evaluate(v=>v.currentTime);
    await page.waitForFunction(start=>{const v=document.querySelector('[data-hero]');return !v.paused&&v.currentTime>start+0.2;},t0,{timeout:15000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px has no horizontal overflow`);
    assert.equal(await page.locator('#first-visit').count(),1);
    assert.equal(await page.locator('#start').count(),1);
    const faq=page.locator('.start-questions details');assert.equal(await faq.count(),4);
    for(let i=0;i<4;i++){
      await faq.nth(i).locator('summary').focus();await page.keyboard.press('Enter');
      assert.equal(await faq.nth(i).getAttribute('open'),'');
      await page.keyboard.press('Enter');assert.equal(await faq.nth(i).getAttribute('open'),null);
    }
    assert.match(await page.locator('[data-track="donate-checkout"]').getAttribute('href'),/^https:\/\/donate\.stripe\.com\//);
    assert.equal(await page.locator('[data-track="play-hero"]').getAttribute('href'),'play/?workspace=habitat');
    assert.deepEqual(errors,[]);assert.deepEqual(clarity,[],'Clarity does not load before consent');
    const necessary=page.getByRole('button',{name:'Only necessary',exact:true});
    if(await necessary.isVisible())await necessary.click();
    if(process.env.QA_OUTPUT){
      fs.mkdirSync(process.env.QA_OUTPUT,{recursive:true});
      await page.locator('#first-visit').screenshot({path:path.join(process.env.QA_OUTPUT,`first-visit-${width}.png`)});
    }
    console.log(`PASS ${width}px: film advances, no overflow, onboarding + keyboard FAQ, play/donation links, no page errors or pre-consent Clarity`);
    await context.close();
  }
} finally {
  await browser?.close();
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
