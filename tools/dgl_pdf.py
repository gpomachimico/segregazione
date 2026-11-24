import pdfplumber, re, json, sys
F='/mnt/user-data/uploads/5fa493c6-MSC_108-20-Add.2_-_IMDG_42-24.pdf'
COLS=['1','2','3','4','5','6','7a','7b','8','9','10','11','12','13','14','15','16a','16b','17','18']
out=[]; cur=None
def flush():
    global cur
    if cur: out.append(cur); cur=None
with pdfplumber.open(F) as pdf:
    for pn in range(594,766):
        pg=pdf.pages[pn-1]
        w=pg.extract_words(x_tolerance=1.5,y_tolerance=2)
        hdr={x['text'][1:-1]:x['x0'] for x in w if re.fullmatch(r'\((\d+[ab]?)\)',x['text']) and x['top']<160}
        if 'n1' in hdr: pass
        if len(hdr)<18: 
            print('pagina senza intestazioni',pn,file=sys.stderr); continue
        htop=min(x['top'] for x in w if re.fullmatch(r'\((\d+[ab]?)\)',x['text']) and x['top']<160)
        VL=[43,65,190,218,255,289,326,363,400,439,476,516,553,638,655,694,731,771,828,884,1125,1148]
        cen={c:hdr[c]+6 for c in hdr}
        bounds=[]
        for a,b in zip(VL,VL[1:]):
            lab=[c for c in cen if a<=cen[c]<b]
            bounds.append((lab[0] if lab else f'x{a}',a-1))
        def col(x):
            c0=None
            for c,b in bounds:
                if x>=b: c0=c
            return c0 or '1'
        body=[x for x in w if x['top']>htop+24 and x['top']<pg.height-40]
        body.sort(key=lambda x:x['top'])
        lines=[]
        for x in body:
            if lines and x['top']-lines[-1][0]<=3.5: lines[-1][1].append(x)
            else: lines.append([x['top'],[x]])
        seq=[]
        for _,L in lines:
            L.sort(key=lambda x:x['x0']); seq+=L
        for x in seq:
            c=col(x['x0'])
            t=x['text']
            if c=='1' and re.fullmatch(r'\d{4}',t):
                flush(); cur={'un':t,'pag':pn,'top':x['top'],'c':{}}
                continue
            if cur is None: continue
            cur['c'].setdefault(c,[]).append(t)
flush()
for e in out:
    e['c']={k:' '.join(v) for k,v in e['c'].items()}
json.dump(out,open('/home/claude/work/dgl_pdf.json','w'),ensure_ascii=False,indent=0)
print(len(out),len({e['un'] for e in out}))
