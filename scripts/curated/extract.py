#!/usr/bin/env python3
"""Pull the Offseason News screenshots out of the workbook into ./images."""
import zipfile, re, os, shutil, sys
from xml.etree import ElementTree as ET

XL = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/Downloads/2026-2027 Fantasy Football Analytics (Original) (1).xlsx")
SHEET = "sheet10.xml"   # Offseason News

z = zipfile.ZipFile(XL)
rel = z.read(f"xl/worksheets/_rels/{SHEET}.rels").decode()
dwg = re.search(r'Target="([^"]*drawing\d+\.xml)"', rel).group(1).split("/")[-1]
drels = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]*media/[^"]+)"',
                        z.read(f"xl/drawings/_rels/{dwg}.rels").decode()))
A = "{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}"
D = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

shutil.rmtree("images", ignore_errors=True); os.makedirs("images")
n = 0
for anc in ET.fromstring(z.read(f"xl/drawings/{dwg}")):
    blip = anc.find(f".//{D}blip")
    if blip is None: continue
    tgt = drels.get(blip.get(R + "embed"))
    if not tgt: continue
    name = tgt.split("/")[-1]
    open(f"images/{name}", "wb").write(z.read("xl/media/" + name)); n += 1
print(f"extracted {n} images to ./images")
