import fs from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { makeSlides } from "./copilot-content.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = process.env.PRESENTATION_SKILL_DIR ?? "/Users/junwoojeong/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.11814/skills/presentations";
const revision = process.argv[2] ?? "v1";
if (!/^[a-z0-9-]+$/.test(revision)) throw new Error("Invalid presentation revision name.");
const build = join(root, ".build", `presentation-${revision}`);
const output = join(root, ".build", "approved");
await fs.mkdir(build, { recursive: true });
await fs.mkdir(output, { recursive: true });
await fs.mkdir(join(root, "delivery"), { recursive: true });
const evidence = resolve(process.env.DEMO_EVIDENCE_DIR ?? join(root, "demo/copilot-evidence"));
const screens = resolve(process.env.DEMO_SCREENS_DIR ?? join(root, ".build/copilot/screens"));
const verification = JSON.parse(await fs.readFile(join(evidence, "03-verification.json"), "utf8"));
const manifest = JSON.parse(await fs.readFile(resolve(process.env.DEMO_MANIFEST_PATH ?? join(evidence, "manifest.json")), "utf8"));
const slides = makeSlides(verification, manifest);
const tableOwners = slides.flatMap((slide, index) => slide.elements.some((element) => element.kind === "table") ? [index + 1] : []);
const font = "Nanum Gothic";
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const emu = (px) => Math.round(px * 9525);
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const ns = `xmlns:a="${A}" xmlns:p="${P}" xmlns:r="${R}"`;
const xml = (body) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;
const relationships = (items) => xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join("")}</Relationships>`);
const clrMap = '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>';
const group = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const files = [];
async function write(name, content) {
  await fs.mkdir(dirname(join(build, name)), { recursive: true });
  await fs.writeFile(join(build, name), content);
  files.push(name);
}
const xfrm = (e) => `<a:xfrm><a:off x="${emu(e.x)}" y="${emu(e.y)}"/><a:ext cx="${emu(e.w)}" cy="${emu(e.h)}"/></a:xfrm>`;
function paragraphs(value, size = 28, color = "172033", bold = false) {
  const run = `lang="ko-KR" sz="${Math.round(size * 75)}" b="${bold ? 1 : 0}"`;
  return String(value).split("\n").map((line) => `<a:p><a:pPr marL="0" marR="0" indent="0"><a:lnSpc><a:spcPct val="125000"/></a:lnSpc><a:buNone/></a:pPr><a:r><a:rPr ${run}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/></a:rPr><a:t>${esc(line)}</a:t></a:r><a:endParaRPr ${run}/></a:p>`).join("");
}
function shape(e, id) {
  const nv = `<p:nvSpPr><p:cNvPr id="${id}" name="${e.kind === "text" ? "Text" : "Diagram"} ${id}"/><p:cNvSpPr${e.kind === "text" ? ' txBox="1"' : ""}/><p:nvPr/></p:nvSpPr>`;
  const fill = e.kind === "rect" ? `<a:solidFill><a:srgbClr val="${e.fill}"/></a:solidFill>` : "<a:noFill/>";
  const body = e.kind === "text" ? `<p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paragraphs(e.value, e.size, e.color, e.bold)}</p:txBody>` : "";
  return `<p:sp>${nv}<p:spPr>${xfrm(e)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill}<a:ln><a:noFill/></a:ln></p:spPr>${body}</p:sp>`;
}
function connector(e, id) {
  return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Handoff ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xfrm(e)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="19050"><a:solidFill><a:srgbClr val="${e.color}"/></a:solidFill>${e.arrow ? '<a:tailEnd type="triangle" w="sm" len="sm"/>' : ""}</a:ln></p:spPr></p:cxnSp>`;
}
function nativeTable(e, id) {
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Concept comparison"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${emu(e.x)}" y="${emu(e.y)}"/><a:ext cx="${emu(e.w)}" cy="${emu(e.h)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="0"/><a:tblGrid>${e.widths.map((w) => `<a:gridCol w="${emu(w)}"/>`).join("")}</a:tblGrid>${e.rows.map((row, i) => `<a:tr h="${emu(e.h / e.rows.length)}">${row.map((cell) => `<a:tc><a:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${paragraphs(cell, i ? 24 : 25, i ? "172033" : "FFFFFF", !i)}</a:txBody><a:tcPr marL="190500" marR="152400" marT="152400" marB="95250" anchor="ctr"><a:solidFill><a:srgbClr val="${i ? (i % 2 ? "FFFFFF" : "EEEAF7") : "584185"}"/></a:solidFill></a:tcPr></a:tc>`).join("")}</a:tr>`).join("")}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
}
const imageData = new Map();
let imageNumber = 0;
for (const [index, slide] of slides.entries()) {
  const rels = [["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "notesSlide", `../notesSlides/notesSlide${index + 1}.xml`]];
  const objects = [];
  for (const [objectIndex, e] of slide.elements.entries()) {
    const id = objectIndex + 2;
    if (e.kind === "text" || e.kind === "rect") objects.push(shape(e, id));
    else if (e.kind === "line") { if (e.w > 0) objects.push(connector(e, id)); }
    else if (e.kind === "table") objects.push(nativeTable(e, id));
    else if (e.kind === "image") {
      const data = await fs.readFile(join(screens, e.file));
      if (data.toString("ascii", 1, 4) !== "PNG") throw new Error(`Expected PNG evidence: ${e.file}`);
      imageData.set(e.file, `data:image/png;base64,${data.toString("base64")}`);
      const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
      const factor = Math.min(e.w / width, e.h / height);
      const fit = { x: e.x + (e.w - width * factor) / 2, y: e.y + (e.h - height * factor) / 2, w: width * factor, h: height * factor };
      const name = `image${++imageNumber}.png`, rid = `rId${rels.length + 1}`;
      await write(`ppt/media/${name}`, data);
      rels.push([rid, "image", `../media/${name}`]);
      objects.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(e.file)}" descr="Actual local demo screenshot"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(fit)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`);
    }
  }
  await write(`ppt/slides/slide${index + 1}.xml`, xml(`<p:sld ${ns}><p:cSld name="${esc(slide.title)}"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${slide.background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${objects.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`));
  await write(`ppt/slides/_rels/slide${index + 1}.xml.rels`, relationships(rels));
  const note = `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Speaker notes"/><p:cNvSpPr txBox="1"/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr>${xfrm({x:50,y:120,w:620,h:700})}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${paragraphs(slide.notes, 16, "172033")}</p:txBody></p:sp>`;
  await write(`ppt/notesSlides/notesSlide${index + 1}.xml`, xml(`<p:notes ${ns}><p:cSld><p:spTree>${group}${note}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`));
  await write(`ppt/notesSlides/_rels/notesSlide${index + 1}.xml.rels`, relationships([["rId1", "notesMaster", "../notesMasters/notesMaster1.xml"], ["rId2", "slide", `../slides/slide${index + 1}.xml`]]));
}

await write("ppt/slideLayouts/slideLayout1.xml", xml(`<p:sldLayout ${ns} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`));
await write("ppt/slideLayouts/_rels/slideLayout1.xml.rels", relationships([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]));
await write("ppt/slideMasters/slideMaster1.xml", xml(`<p:sldMaster ${ns}><p:cSld><p:spTree>${group}</p:spTree></p:cSld>${clrMap}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`));
await write("ppt/slideMasters/_rels/slideMaster1.xml.rels", relationships([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "theme", "../theme/theme1.xml"]]));
await write("ppt/notesMasters/notesMaster1.xml", xml(`<p:notesMaster ${ns}><p:cSld><p:spTree>${group}</p:spTree></p:cSld>${clrMap}<p:notesStyle/></p:notesMaster>`));
await write("ppt/notesMasters/_rels/notesMaster1.xml.rels", relationships([["rId1", "theme", "../theme/theme1.xml"]]));
const colors = { dk1: "172033", lt1: "FFFFFF", dk2: "101523", lt2: "F7F8FC", accent1: "7652C4", accent2: "19734A", accent3: "AD5B15", accent4: "637085", accent5: "C9B6F2", accent6: "E8F3EC", hlink: "7652C4", folHlink: "584185" };
const schemeFill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
await write("ppt/theme/theme1.xml", xml(`<a:theme xmlns:a="${A}" name="Executive Copilot"><a:themeElements><a:clrScheme name="Executive">${Object.entries(colors).map(([name, color]) => `<a:${name}><a:srgbClr val="${color}"/></a:${name}>`).join("")}</a:clrScheme><a:fontScheme name="Korean"><a:majorFont><a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/></a:majorFont><a:minorFont><a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/></a:minorFont></a:fontScheme><a:fmtScheme name="Simple"><a:fillStyleLst>${schemeFill.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${[9525,19050,28575].map((w)=>`<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr">${schemeFill}<a:prstDash val="solid"/><a:miter lim="800000"/><a:headEnd type="none"/><a:tailEnd type="none"/></a:ln>`).join("")}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${schemeFill.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`));
const notesRid = `rId${slides.length + 2}`;
await write("ppt/presentation.xml", xml(`<p:presentation ${ns}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="${notesRid}"/></p:notesMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256+i}" r:id="rId${i+2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="${emu(1280)}" cy="${emu(720)}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`));
await write("ppt/_rels/presentation.xml.rels", relationships([["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ...slides.map((_,i) => [`rId${i+2}`, "slide", `slides/slide${i+1}.xml`]), [notesRid,"notesMaster","notesMasters/notesMaster1.xml"]]));
await write("_rels/.rels", xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`));
await write("docProps/core.xml", xml('<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>GitHub Copilot: Agentic Development in Action</dc:title><dc:subject>CXO demo: refund approval and audit</dc:subject><dc:creator>GitHub Copilot</dc:creator></cp:coreProperties>'));
await write("docProps/app.xml", xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Native PresentationML</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slides.length}</Slides><Notes>${slides.length}</Notes></Properties>`));
const types = {
  "ppt/presentation.xml": "presentationml.presentation.main", "ppt/slideMasters/slideMaster1.xml": "presentationml.slideMaster", "ppt/slideLayouts/slideLayout1.xml": "presentationml.slideLayout", "ppt/theme/theme1.xml": "theme", "ppt/notesMasters/notesMaster1.xml": "presentationml.notesMaster",
  ...Object.fromEntries(slides.flatMap((_,i) => [[`ppt/slides/slide${i+1}.xml`,"presentationml.slide"],[`ppt/notesSlides/notesSlide${i+1}.xml`,"presentationml.notesSlide"]])),
};
await write("[Content_Types].xml", xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${Object.entries(types).map(([name,type])=>`<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.${type}+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`));
const candidate = join(build, "candidate.pptx");
const zipped = spawnSync("zip", ["-q", candidate, ...files], { cwd: build, encoding: "utf8" });
if (zipped.status !== 0) throw new Error(zipped.stderr || "PPTX packaging failed.");
console.warn("Bundled artifact authoring runtime is unavailable here. Native PresentationML packaging is used; first-party import verification is not claimed.");
const { finalizePresentation } = await import(pathToFileURL(join(skill, "container_tools/artifact_tool_utils.mjs")));
const result = await finalizePresentation({
  workspaceDir: root, candidatePath: candidate, finalPath: join(output, `copilot-cxo-${revision}.pptx`),
  pythonExecutable: "/opt/homebrew/bin/python3",
  integrityValidatorPath: join(skill, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: join(skill, "container_tools/inspect_presentation_layout_geometry.py"),
  explicitTotalSlideCount: slides.length, requiredNativeTableOwnerSlides: tableOwners, requiredNativeChartOwnerSlides: [],
  layoutArgs: ["--expected-slide-size-emu", `${emu(1280)},${emu(720)}`, "--validate-heading-fit", "--validate-bullet-geometry", ...tableOwners.flatMap((number) => ["--require-native-table-slide", String(number)])],
  fontPolicy: { basis: "design", families: [font] }, verifyArtifactToolImport: false,
  receiptPath: join(build, "validation.json"),
});
await fs.copyFile(join(output, `copilot-cxo-${revision}.pptx`), join(root, "delivery/github-copilot-cxo-agent-workflow.pptx"));

function htmlElement(e) {
  const style = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;`;
  if (e.kind === "text") return `<div class="text" style="${style}font-size:${e.size}px;color:#${e.color};font-weight:${e.bold?700:400}">${esc(e.value)}</div>`;
  if (e.kind === "image") return `<img alt="${esc(e.file)}: actual local demo capture" style="${style}object-fit:contain" src="${imageData.get(e.file)}">`;
  if (e.kind === "rect") return `<div style="${style}background:#${e.fill}"></div>`;
  if (e.kind === "line") return e.w ? `<div class="connector${e.arrow?" arrow":""}" style="${style}border-color:#${e.color};color:#${e.color}"></div>` : "";
  return `<table style="${style}"><colgroup>${e.widths.map(w=>`<col style="width:${w}px">`).join("")}</colgroup><tbody>${e.rows.map((row,i)=>`<tr style="height:${e.h/e.rows.length}px">${row.map(cell=>`<${i?"td":"th"}>${esc(cell)}</${i?"td":"th"}>`).join("")}</tr>`).join("")}</tbody></table>`;
}
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GitHub Copilot · CXO 데모 슬라이드</title><style>*{box-sizing:border-box}body{margin:0;background:#101523;font-family:'Nanum Gothic',system-ui,sans-serif}#deck{position:absolute;width:1280px;height:720px;transform-origin:top left}.slide{position:absolute;inset:0;overflow:hidden}.slide[hidden]{display:none}.slide>*{position:absolute}.text{white-space:pre-wrap;line-height:1.25}.connector{border-top:2px solid}.arrow:after{content:'';position:absolute;right:-1px;top:-6px;border-left:9px solid;border-top:5px solid transparent;border-bottom:5px solid transparent}table{border-collapse:collapse;table-layout:fixed;font-size:24px;line-height:1.3}td,th{text-align:left;padding:16px 20px;color:#172033}th{background:#584185;color:white}tr:nth-child(2n){background:white}tr:nth-child(2n+3){background:#eeeaf7}#help{position:fixed;bottom:8px;right:16px;font-size:10px;color:#8390a6}body.video #help{display:none}</style><div id="deck">${slides.map((slide,i)=>`<section class="slide" data-slide="${i+1}" data-video-source="${esc(slide.videoSource ?? "")}" aria-label="${esc(slide.title)}" ${i?"hidden":""} style="background:#${slide.background}">${slide.elements.map(htmlElement).join("")}</section>`).join("")}</div><div id="help">← → 이동 · F 전체 화면</div><script>const slides=[...document.querySelectorAll('.slide')];let index=0;function show(n){index=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,i)=>s.hidden=i!==index);document.title=(index+1)+'. '+slides[index].getAttribute('aria-label')}function resize(){const s=Math.min(innerWidth/1280,innerHeight/720);const d=document.querySelector('#deck');d.style.transform='scale('+s+')';d.style.left=(innerWidth-1280*s)/2+'px';d.style.top=(innerHeight-720*s)/2+'px'}function hash(){show(Number(location.hash.slice(1)||1)-1)}addEventListener('resize',resize);addEventListener('hashchange',hash);addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')location.hash=index+2;if(e.key==='ArrowLeft')location.hash=index;if(e.key.toLowerCase()==='f')document.documentElement.requestFullscreen()});if(new URLSearchParams(location.search).has('video'))document.body.classList.add('video');hash();resize();</script></html>`;
await fs.writeFile(join(root, "delivery/slides.html"), html);
await fs.writeFile(join(build, "slides.json"), JSON.stringify(slides, null, 2));
console.log(JSON.stringify({ slides: slides.length, candidate, validated: join(output, `copilot-cxo-${revision}.pptx`), html: "delivery/slides.html", result }, null, 2));
