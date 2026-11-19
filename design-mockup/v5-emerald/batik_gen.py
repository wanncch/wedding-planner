import math, random, sys
OUT = sys.argv[1]
def f(x): return f'{x:.1f}'
class S:
    def __init__(s, line, acc): s.o=[]; s.line=line; s.acc=acc
    def add(s, x): s.o.append(x)
def rot(x,y,a,cx=0,cy=0):
    c,si=math.cos(a),math.sin(a); return cx+x*c-y*si, cy+x*si+y*c
def petal_path(cx,cy,ang,L,W,shape='point'):
    pts=[(0,0),(W,-L*.30),(W*.75,-L*.85),(0,-L),(-W*.75,-L*.85),(-W,-L*.30),(0,0)] if shape=='point' else [(0,0),(W*1.05,-L*.25),(W*1.15,-L*1.0),(0,-L*.92),(-W*1.15,-L*1.0),(-W*1.05,-L*.25),(0,0)]
    p=[rot(x,y,ang,cx,cy) for x,y in pts]
    return f'M{f(p[0][0])} {f(p[0][1])}C{f(p[1][0])} {f(p[1][1])} {f(p[2][0])} {f(p[2][1])} {f(p[3][0])} {f(p[3][1])}C{f(p[4][0])} {f(p[4][1])} {f(p[5][0])} {f(p[5][1])} {f(p[6][0])} {f(p[6][1])}Z'
def flower(s,cx,cy,R,n=6,rot0=0,shape='point'):
    a0=math.radians(rot0)
    for i in range(n):
        a=a0+2*math.pi*i/n
        s.add(f'<path d="{petal_path(cx,cy,a,R,R*.42,shape)}" stroke-width="1.8"/>')
        s.add(f'<path d="{petal_path(cx,cy,a,R*.66,R*.25,shape)}" stroke-width="1"/>')
        for t in (.74,.82,.9):  # titik isen-isen di ujung kelopak
            for side in (-1,1):
                x,y=rot(side*R*.17*(1.1-t),-R*t,a,cx,cy); s.add(f'<circle cx="{f(x)}" cy="{f(y)}" r="{R*.018+.5:.1f}" fill="{s.line}" stroke="none"/>')
        for sd in (-.5,0,.5):
            p1=rot(sd*R*.05,-R*.28,a,cx,cy); p2=rot(sd*R*.12,-R*.58,a,cx,cy)
            s.add(f'<path d="M{f(p1[0])} {f(p1[1])}L{f(p2[0])} {f(p2[1])}" stroke-width=".7"/>')
    s.add(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R*.24)}" fill="{s.acc}" fill-opacity=".35"/>')
    s.add(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R*.15)}"/>')
    for i in range(14):
        a=2*math.pi*i/14; s.add(f'<circle cx="{f(cx+R*.3*math.cos(a))}" cy="{f(cy+R*.3*math.sin(a))}" r="{R*.02+.6:.1f}" fill="{s.line}" stroke="none"/>')
    s.add(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R*.05)}" fill="{s.acc}" stroke="none"/>')
def scallop(s,cx,cy,R,n=8):
    # bunga bergerigi (kelopak bulat berlapis)
    pts=[]
    for k,(rr,w) in enumerate(((R,1.8),(R*.68,1.1))):
        d=''
        for i in range(n):
            a1=2*math.pi*i/n; a2=2*math.pi*(i+1)/n; am=(a1+a2)/2
            x1,y1=cx+rr*.78*math.cos(a1),cy+rr*.78*math.sin(a1); x2,y2=cx+rr*.78*math.cos(a2),cy+rr*.78*math.sin(a2)
            c1=(cx+rr*1.12*math.cos(am-.28),cy+rr*1.12*math.sin(am-.28)); c2=(cx+rr*1.12*math.cos(am+.28),cy+rr*1.12*math.sin(am+.28))
            d+=(f'M{f(x1)} {f(y1)}' if i==0 else '')+f'C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(x2)} {f(y2)}'
        s.add(f'<path d="{d}Z" stroke-width="{w}"/>')
    s.add(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R*.32)}" fill="{s.acc}" fill-opacity=".3"/>')
    for i in range(n):
        a=2*math.pi*(i+.5)/n; s.add(f'<path d="M{f(cx+R*.36*math.cos(a))} {f(cy+R*.36*math.sin(a))}L{f(cx+R*.6*math.cos(a))} {f(cy+R*.6*math.sin(a))}" stroke-width=".9"/>')
    s.add(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R*.12)}" fill="{s.line}" stroke="none"/>')
def floret(s,cx,cy,R):
    for i in range(5):
        a=2*math.pi*i/5-math.pi/2; s.add(f'<circle cx="{f(cx+R*.62*math.cos(a))}" cy="{f(cy+R*.62*math.sin(a))}" r="{f(R*.42)}" stroke-width="1.2"/>')
    s.add(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R*.24)}" fill="{s.acc}" stroke="none"/>')
def leaf(s,x,y,ang,L,W,veins=True):
    p=[rot(a,b,ang,x,y) for a,b in [(0,0),(W,-L*.5),(0,-L),(-W,-L*.5)]]
    s.add(f'<path d="M{f(p[0][0])} {f(p[0][1])}Q{f(p[1][0])} {f(p[1][1])} {f(p[2][0])} {f(p[2][1])}Q{f(p[3][0])} {f(p[3][1])} {f(p[0][0])} {f(p[0][1])}Z" stroke-width="1.5"/>')
    m=[rot(0,-L*t,ang,x,y) for t in (0,.92)]
    s.add(f'<path d="M{f(m[0][0])} {f(m[0][1])}L{f(m[1][0])} {f(m[1][1])}" stroke-width=".9"/>')
    if veins:
        for t in (.25,.42,.59,.75):
            for sd in (-1,1):
                a1=rot(0,-L*t,ang,x,y); a2=rot(sd*W*.55*(1-abs(t-.5)),-L*(t+.12),ang,x,y)
                s.add(f'<path d="M{f(a1[0])} {f(a1[1])}L{f(a2[0])} {f(a2[1])}" stroke-width=".8"/>')
def spiral(s,cx,cy,R,a0,turns=1.6,dirn=1,w=1.6):
    pts=[]; N=40
    for i in range(N+1):
        t=i/N; a=a0+dirn*t*turns*2*math.pi; r=R*(1-t*.82); pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    s.add(f'<path d="M'+' L'.join(f'{f(x)} {f(y)}' for x,y in pts)+f'" stroke-width="{w}"/>')
def bez(p0,p1,p2,p3,t):
    u=1-t; return (u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0], u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1])
def vine(s,P,leaves=(),dots=True,w=2.2,double=True):
    p0,p1,p2,p3=P
    s.add(f'<path d="M{f(p0[0])} {f(p0[1])}C{f(p1[0])} {f(p1[1])} {f(p2[0])} {f(p2[1])} {f(p3[0])} {f(p3[1])}" stroke-width="{w}"/>')
    if double:  # garis kedua tipis + titik di antaranya (khas batik)
        off=[(x+5,y+5) for x,y in P]
        s.add(f'<path d="M{f(off[0][0])} {f(off[0][1])}C{f(off[1][0])} {f(off[1][1])} {f(off[2][0])} {f(off[2][1])} {f(off[3][0])} {f(off[3][1])}" stroke-width=".9"/>')
    for t,side,L in leaves:
        x,y=bez(p0,p1,p2,p3,t); x2,y2=bez(p0,p1,p2,p3,min(1,t+.01))
        ang=math.atan2(y2-y,x2-x)+math.pi/2+side*1.0
        leaf(s,x,y,ang,L*1.6,L*.55)
    if dots:
        for i in range(2,30,2):
            x,y=bez(p0,p1,p2,p3,i/30); s.add(f'<circle cx="{f(x+9)}" cy="{f(y-6)}" r="1.4" fill="{s.line}" stroke="none"/>')
def cloud(s,cx,cy,W,H,levels=4):
    # mega mendung: kontur berlekuk yang diulang mengecil ke tengah, ujung bawah melingkar
    lobes=[(-1.0,.05,.42),(-.62,-.45,.5),(-.1,-.72,.58),(.45,-.5,.5),(.9,-.02,.42),(.5,.42,.36),(0,.5,.34),(-.5,.42,.36)]
    def outline(k):
        pts=[(cx+W*x,cy+H*y) for x,y,_ in lobes]
        d=''
        n=len(pts)
        for i in range(n):
            x1,y1=pts[i]; x2,y2=pts[(i+1)%n]
            mx,my=(x1+x2)/2,(y1+y2)/2
            dx,dy=mx-cx,my-cy; L=math.hypot(dx,dy) or 1
            bulge=.55*math.hypot(x2-x1,y2-y1)
            c=(mx+dx/L*bulge, my+dy/L*bulge)
            if i==0: d+=f'M{f(x1)} {f(y1)}'
            d+=f'Q{f(c[0])} {f(c[1])} {f(x2)} {f(y2)}'
        return d+'Z'
    for k in range(levels):
        sc=1-k*.22
        s.add(f'<g transform="translate({f(cx)} {f(cy)}) scale({sc:.2f}) translate({f(-cx)} {f(-cy)})"><path d="{outline(k)}" fill="{s.acc}" fill-opacity="{.08+.07*k:.2f}" stroke-width="{(1.8 if k==0 else 1.2)/sc:.2f}"/></g>')
    spiral(s,cx-W*1.05,cy+H*.35,H*.32,0,1.4,1,1.4)
    spiral(s,cx+W*.98,cy+H*.38,H*.3,math.pi,1.4,-1,1.4)
def dotcluster(s,cx,cy,n=3,r=2.2):
    for i in range(n):
        a=2*math.pi*i/n; s.add(f'<circle cx="{f(cx+r*2.2*math.cos(a))}" cy="{f(cy+r*2.2*math.sin(a))}" r="{r}" fill="{s.line}" stroke="none"/>')
def drop(s,x,y,ang,L):
    p=[rot(a,b,ang,x,y) for a,b in [(0,0),(L*.35,-L*.6),(0,-L),(-L*.12,-L*.55)]]
    s.add(f'<path d="M{f(p[0][0])} {f(p[0][1])}Q{f(p[1][0])} {f(p[1][1])} {f(p[2][0])} {f(p[2][1])}Q{f(p[3][0])} {f(p[3][1])} {f(p[0][0])} {f(p[0][1])}Z" fill="{s.line}" stroke="none"/>')

def svg(w,h,s): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><g fill="none" stroke="{s.line}" stroke-linecap="round" stroke-linejoin="round">'+''.join(s.o)+'</g></svg>'

def ornament(line,acc):
    """Rangkaian sudut 900x900 (mekar dari sudut kiri atas)."""
    s=S(line,acc); random.seed(7)
    # sulur utama
    vine(s,[(20,880),(120,640),(60,420),(260,300)],leaves=[(.2,1,46),(.35,-1,40),(.55,1,44),(.75,-1,36)])
    vine(s,[(260,300),(420,210),(520,120),(700,90)],leaves=[(.2,-1,40),(.45,1,46),(.7,-1,38)])
    vine(s,[(260,300),(330,420),(480,470),(600,420)],leaves=[(.3,1,40),(.6,-1,36)])
    vine(s,[(160,560),(260,600),(330,700),(300,800)],leaves=[(.35,-1,36),(.65,1,34)],double=False)
    vine(s,[(420,210),(400,110),(320,60),(260,40)],leaves=[(.4,1,32)],double=False)
    for (x,y,r,a,d) in [(700,90,34,0,1),(600,420,30,2,-1),(300,800,28,1,1),(260,40,22,3,-1),(20,880,0,0,1)]:
        if r: spiral(s,x+r*.2,y-r*.9,r,a,1.7,d)
    flower(s,260,300,96,6,10)
    flower(s,560,250,62,5,-12,'round')
    scallop(s,130,470,52,9)
    scallop(s,470,470,44,8)
    flower(s,690,170,40,6,30)
    scallop(s,360,650,40,8)
    flower(s,80,760,34,5,20,'round'); scallop(s,610,90,24,8); flower(s,250,520,30,6,0)
    for (x,y,r) in [(390,110,20),(180,190,18),(640,330,16),(90,700,18),(230,700,15),(520,70,14),(780,250,14),(420,360,14)]:
        floret(s,x,y,r)
    cloud(s,700,560,120,60)
    cloud(s,120,110,80,40,3)
    cloud(s,560,760,90,46,3)
    for i in range(40):
        x,y=random.uniform(30,860),random.uniform(30,860)
        if x+y<1100: dotcluster(s,x,y,3,1.8)
    for (x,y,a) in [(340,190,-.6),(200,400,.8),(620,480,2),(470,140,-1.2),(150,600,1.4),(780,140,.4),(300,520,2.6)]:
        drop(s,x,y,a,16)
    return svg(900,900,s)

def tile(line,acc):
    """Ubin 520 isen-isen: awan kecil, bunga kecil, titik & sulur pendek (lebih jarang)."""
    s=S(line,acc); random.seed(3)
    cloud(s,130,150,62,32,3)
    cloud(s,400,400,54,28,3)
    scallop(s,390,120,26,8)
    flower(s,130,400,30,5,0,'round')
    floret(s,260,260,14); floret(s,470,260,10); floret(s,40,280,10); floret(s,260,480,11)
    for P in [[(180,210),(220,250),(250,200),(300,230)],[(330,330),(300,300),(260,330),(230,300)],[(440,150),(480,190),(470,230),(500,240)]]:
        vine(s,P,leaves=[(.5,1,18)],dots=False,w=1.4,double=False)
    spiral(s,60,40,16,0,1.5,1,1.2); spiral(s,330,30,14,2,1.5,-1,1.2); spiral(s,480,480,14,1,1.5,1,1.2)
    for i in range(70):
        x,y=random.uniform(5,515),random.uniform(5,515)
        s.add(f'<circle cx="{f(x)}" cy="{f(y)}" r="{random.choice((1,1.2,1.6))}" fill="{line}" stroke="none"/>')
    return svg(520,520,s)

import os
open(os.path.join(OUT,'batik-ornamen.svg'),'w').write(ornament('#0B5843','#B8914F'))
open(os.path.join(OUT,'batik.svg'),'w').write(tile('#0B5843','#B8914F'))
open(os.path.join(OUT,'batik-light.svg'),'w').write(tile('#F5EDDF','#D6B57A'))
open(os.path.join(OUT,'batik-ornamen-light.svg'),'w').write(ornament('#F5EDDF','#D6B57A'))
