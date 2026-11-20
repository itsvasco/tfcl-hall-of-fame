#!/usr/bin/env node
// Liest die Liste aller ITSF-Turniere mit FAST-Kennung aus der archivierten Ranglistenseite der ITSF (Auswahl «Choose a Tournament»).
//   curl -sL "https://web.archive.org/web/20241202125719id_/https://www.tablesoccer.org/page/rankings" -o rankings.html
//   node tools/fast-liste.mjs rankings.html liste.json
import fs from "node:fs";
const h=fs.readFileSync(process.argv[2],"utf8");
const i=h.indexOf("Choose a Tournament"); if(i<0){console.log("kein dropdown");process.exit()}
const s=h.slice(i, h.indexOf("</select>",i));
let tour=null; const out=[]; const re=/<optgroup label="([^"]*)"|<option value="([^"]*)">([^<]*)/g; let m;
while((m=re.exec(s))){ if(m[1]) tour=m[1]; else out.push({tour,url:m[2],id:(m[2].match(/id=(\d+)/)||[])[1],name:m[3].trim()}); }
const c={}; for(const o of out) c[o.tour]=(c[o.tour]||0)+1; console.log(JSON.stringify(c), out.length, out.slice(0,2));
if(process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out,null,1));
