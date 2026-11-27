import re, json
L=open('/home/claude/work/erg.txt',encoding='utf-8').read().split('\n')
seg=L[14021:15762]
rowre=re.compile(r'^\s*(\d{4})\s+(\d{3}P?)\s+(.*)$')
dist=re.compile(r'(\d+(?:\.\d+)?)(\+?)\s*(m|km)\s*\(')
SKIP=('ISOLATE','in all','ID ','No.','SMALL','LARGE','(From','First','—','TABLE','"+"','Page ')
def pdata(s):
    v=dist.findall(s); t3='Refer to Table 3' in s
    if not v: return None,s
    d={'piccolo':{'isol_m':float(v[0][0]),'giorno_km':float(v[1][0]),'notte_km':float(v[2][0])}}
    if v[2][1]: d['piccolo']['notte_plus']=True
    if len(v)>=6:
        d['grande']={'isol_m':float(v[3][0]),'giorno_km':float(v[4][0]),'notte_km':float(v[5][0])}
        if v[5][1]: d['grande']['notte_plus']=True
    elif t3: d['grande']='Tabella 3'
    if len(v) not in (3,6): raise Exception(s)
    return d, s[:dist.search(s).start()]
blocks=[]; pg=0
for s in seg:
    st=s.strip()
    if st.startswith('Page '): pg+=1
    if not st or st.startswith(SKIP) or 'means distance' in st: continue
    m=rowre.match(s)
    if m:
        un,g,rest=m.groups(); d,name=pdata(rest)
        blocks.append({'un':un,'guida':g,'nome':name.strip(),'d':d,'src':'inline' if d else None,'pg':pg}); continue
    d,txt=pdata(s); txt=txt.strip()
    if not blocks: continue
    b=blocks[-1]
    if txt: b['nome']+=' '+txt
    if d:
        if b['d']: raise Exception('doppio '+s)
        b['d']=d; b['src']='inline' if txt else 'sola'
for b in blocks: b['nome']=re.sub(r'\s+',' ',b['nome'])
for i,b in enumerate(blocks):
    if b['d']: continue
    p=blocks[i-1] if i else None
    if p and p['un']==b['un'] and p['d'] and p['src'] in ('sola','eredita_sola') and p['pg']==b['pg']:
        b['d']=p['d']; b['src']='eredita_sola'; continue
    for n in blocks[i+1:]:
        if n['un']!=b['un']: break
        if n['d']: b['d']=n['d']; b['src']='successivo'; break
    if not b['d']:
        for q in reversed(blocks[:i]):
            if q['un']!=b['un']: break
            if q['d']: b['d']=q['d']; b['src']='precedente'; break
miss=[(b['un'],b['nome']) for b in blocks if not b['d']]
print(len(blocks),len({b['un'] for b in blocks}),'senza dati',miss)
json.dump(blocks,open('/home/claude/work/erg_t1.json','w'),ensure_ascii=False,indent=0)
