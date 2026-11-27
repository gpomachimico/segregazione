import re, json
L=open('/home/claude/work/erg.txt',encoding='utf-8').read().split('\n')
G={}
for j,l in enumerate(L):
    if not re.match(r'^\s*EVACUATION\s*$',l): continue
    k=j+1; buf=[]
    while k<len(L) and not re.match(r'^\s*Page \d+',L[k]):
        buf.append(L[k].strip()); k+=1
    # header of next page
    hdr=L[k+1:k+4]
    num=None; title=''
    for q in range(3):
        mm=re.search(r'(1[1-7]\d)\s*$',hdr[q])
        if mm: num=mm.group(1); break
    if not num: print('?',j); continue
    title=' '.join(re.sub(r'GUIDE|\b1[1-7]\d\s*$','',h).strip() for h in hdr[:q+1]).strip()
    txt=re.sub(r'\s+',' ',' '.join(buf)).strip()
    G[num]={'titolo':re.sub(r'\s+',' ',title),'evacuazione_en':txt,'riga':j+1}
def m2(s):
    return int(s.replace(',',''))
for n,g in G.items():
    t=g['evacuazione_en']
    sec=dict(re.findall(r'(Immediate precautionary measure|Large Spill|Fire|Spill)\s*(.*?)(?=(?:Immediate precautionary measure|Large Spill|Fire |Spill )|$)',t))
    iso=re.search(r'Isolate spill or leak area .*?(\d[\d,]*) meters',sec.get('Immediate precautionary measure',''))
    g['isolamento_m']=m2(iso.group(1)) if iso else None
    ls=sec.get('Large Spill','')
    e=re.search(r'(\d[\d,]*) meters',ls); g['evac_grande_m']=m2(e.group(1)) if e else None
    f=sec.get('Fire','')
    e=re.search(r'ISOLATE for (\d[\d,]*) meters',f) or re.search(r'(\d[\d,]*) meters',f); g['incendio_m']=m2(e.group(1)) if e else None
print(len(G),sorted(G))
for n in ('111','112','124','125','128','154','117'):
    print(n,{k:v for k,v in G[n].items() if k!='riga'})
json.dump(G,open('/home/claude/work/erg_guide.json','w'),ensure_ascii=False,indent=0)
