import math, random, sys, os
F=lambda v:f'{v:.1f}'
def lerp(a,b,t): return a+(b-a)*t
def catmull(pts,n=24):
    out=[]; P=[pts[0]]+pts+[pts[-1]]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
        for k in range(n):
            t=k/n; t2=t*t; t3=t2*t
            out.append(tuple(.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3) for j in (0,1)))
    out.append(pts[-1]); return out
def normals(pts):
    N=[]
    for i in range(len(pts)):
        a=pts[max(0,i-1)]; b=pts[min(len(pts)-1,i+1)]
        dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy) or 1; N.append((-dy/L,dx/L))
    return N
def poly(pts): return 'M'+' L'.join(F(x)+' '+F(y) for x,y in pts)+'Z'
def line(pts): return 'M'+' L'.join(F(x)+' '+F(y) for x,y in pts)
class Art:
    def __init__(s,dark,acc,light): s.o=[]; s.D=dark; s.A=acc; s.L=light
    def fill(s,d,c=None,op=1): s.o.append(f'<path d="{d}" fill="{c or s.D}"'+(f' fill-opacity="{op}"' if op<1 else '')+'/>')
    def stroke(s,d,c=None,w=1,op=1): s.o.append(f'<path d="{d}" fill="none" stroke="{c or s.L}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'+(f' stroke-opacity="{op}"' if op<1 else '')+'/>')
    def dot(s,x,y,r,c=None): s.o.append(f'<circle cx="{F(x)}" cy="{F(y)}" r="{F(r)}" fill="{c or s.D}"/>')
    # ---- sapuan menipis
    def taper(s,ctrl,w0,w1,c=None,n=20):
        pts=catmull(ctrl,n); N=normals(pts); m=len(pts)
        Lp=[];Rp=[]
        for i,(p,nv) in enumerate(zip(pts,N)):
            t=i/(m-1); w=lerp(w0,w1,t)/2
            Lp.append((p[0]+nv[0]*w,p[1]+nv[1]*w)); Rp.append((p[0]-nv[0]*w,p[1]-nv[1]*w))
        s.fill(poly(Lp+Rp[::-1]),c); return pts
    def curl(s,cx,cy,R,a0,turns=1.25,d=1,w=3,c=None):
        ctrl=[]
        for i in range(31):
            t=i/30; a=a0+d*t*turns*2*math.pi; r=R*(1-t*.78); ctrl.append((cx+r*math.cos(a),cy+r*math.sin(a)))
        s.taper(ctrl,w,.6,c,4); s.dot(ctrl[-1][0],ctrl[-1][1],w*.55,c)
    # ---- bentuk berpusat sumbu (kelopak/daun)
    def blade(s,base,ang,L,W,bend=0,tip=0,prof=.9,asym=0,n=40):
        """Kelopak/daun: sumbu melengkung (bend), ujung melintir (tip), lebar W."""
        cen=[];Lp=[];Rp=[]
        for i in range(n+1):
            t=i/n
            x=bend*L*math.sin(math.pi*t)*.5+tip*L*t**3*.6; y=-L*t
            cen.append((x,y))
        cen2=[];
        for i,(x,y) in enumerate(cen):
            c,si=math.cos(ang),math.sin(ang); cen2.append((base[0]+x*c-y*si,base[1]+x*si+y*c))
        N=normals(cen2)
        for i,(p,nv) in enumerate(zip(cen2,N)):
            t=i/n; w=W*(math.sin(math.pi*min(1,t**.85)))**prof/2
            wl=w*(1+asym); wr=w*(1-asym)
            Lp.append((p[0]+nv[0]*wl,p[1]+nv[1]*wl)); Rp.append((p[0]-nv[0]*wr,p[1]-nv[1]*wr))
        return cen2,Lp,Rp
    def leaf(s,base,ang,L,W,bend=.25,tip=.15,style='dark'):
        cen,Lp,Rp=s.blade(base,ang,L,W,bend,tip)
        if style=='dark':
            s.fill(poly(Lp+Rp[::-1]))
            s.stroke(line(cen[3:-6]),s.L,max(1,W*.07))
            for t in (.22,.38,.54,.7):
                i=int(t*len(cen)); j=min(len(cen)-1,i+5)
                for side in (Lp,Rp):
                    q=side[j]; p=cen[i]; s.stroke(line([p,(lerp(p[0],q[0],.78),lerp(p[1],q[1],.78))]),s.L,max(.8,W*.045))
        else:  # daun emas bergaris tepi
            s.fill(poly(Lp+Rp[::-1]),s.A,.55); s.stroke(poly(Lp+Rp[::-1]),s.D,max(1.2,W*.07)); s.stroke(line(cen[2:-4]),s.D,max(.8,W*.05))
            for i in range(6,len(cen)-6,5): s.dot(cen[i][0]+(Lp[i][0]-cen[i][0])*.45,cen[i][1]+(Lp[i][1]-cen[i][1])*.45,max(.9,W*.05)); s.dot(cen[i][0]+(Rp[i][0]-cen[i][0])*.45,cen[i][1]+(Rp[i][1]-cen[i][1])*.45,max(.9,W*.05))
    # ---- bunga mekar berlapis
    def bloom(s,cx,cy,R,n=6,rot=0,curl=.35):
        a0=math.radians(rot)
        for i in range(n):  # lapisan belakang (emas, lebar)
            a=a0+2*math.pi*(i+.5)/n
            cen,Lp,Rp=s.blade((cx,cy),a+math.pi/2,R*1.05,R*.8,.18,curl*.7,.55,.1)
            s.fill(poly(Lp+Rp[::-1]),s.A,.5); s.stroke(poly(Lp+Rp[::-1]),s.D,R*.025+.6)
            for k in range(4,len(cen)-4,4): s.dot(cen[k][0],cen[k][1],R*.022+.4)
        for i in range(n):  # lapisan depan (gelap, ujung melintir)
            a=a0+2*math.pi*i/n
            cen,Lp,Rp=s.blade((cx,cy),a+math.pi/2,R*.9,R*.78,.16,curl,.6,.12)
            s.fill(poly(Lp+Rp[::-1]))
            inner=[(lerp(c[0],p[0],.62),lerp(c[1],p[1],.62)) for c,p in zip(cen,Lp)][6:-4]
            inner2=[(lerp(c[0],p[0],.62),lerp(c[1],p[1],.62)) for c,p in zip(cen,Rp)][6:-4]
            s.stroke(line(inner+inner2[::-1]),s.L,R*.022+.5)
            for k in range(12,len(cen)-8,4): s.dot(cen[k][0],cen[k][1],R*.02+.4,s.L)
        s.dot(cx,cy,R*.3); s.dot(cx,cy,R*.22,s.A)
        for i in range(16):
            a=2*math.pi*i/16; s.dot(cx+R*.26*math.cos(a),cy+R*.26*math.sin(a),R*.025+.4,s.L)
        for i in range(10):  # benang sari
            a=2*math.pi*i/10+.2; p=(cx+R*.12*math.cos(a),cy+R*.12*math.sin(a)); q=(cx+R*.2*math.cos(a),cy+R*.2*math.sin(a))
            s.stroke(line([p,q]),s.D,R*.018+.4); s.dot(q[0],q[1],R*.022+.4)
        s.dot(cx,cy,R*.07)
    def bud(s,base,ang,L):
        cen,Lp,Rp=s.blade(base,ang,L,L*.5,0,.1,.6)
        s.fill(poly(Lp+Rp[::-1]),s.A,.55); s.stroke(poly(Lp+Rp[::-1]),s.D,L*.04+.5)
        for side in (-1,1):  # kelopak pelindung
            c2,L2,R2=s.blade(base,ang+side*.45,L*.7,L*.28,side*.2,side*.25,.8)
            s.fill(poly(L2+R2[::-1]))
        s.dot(cen[-1][0],cen[-1][1],L*.05)
    def blossom(s,cx,cy,R,rot=0):
        for i in range(5):
            a=math.radians(rot)+2*math.pi*i/5
            cen,Lp,Rp=s.blade((cx,cy),a,R,R*.85,0,.15,.6)
            s.fill(poly(Lp+Rp[::-1])); s.stroke(line(cen[8:-8]),s.L,R*.06+.3)
        s.dot(cx,cy,R*.28,s.A); s.dot(cx,cy,R*.12)
    # ---- mega mendung berpita
    def mega(s,cx,cy,W,H,bands=5):
        lob=[(-1.0,.18),(-.86,-.30),(-.55,-.62),(-.18,-.90),(.2,-.66),(.5,-.84),(.82,-.45),(1.0,.08),(.72,.42),(.3,.30),(-.1,.48),(-.55,.40)]
        def outline(sc):
            pts=[(cx+W*x*sc,cy+H*y*sc) for x,y in lob]; d=''; n=len(pts)
            for i in range(n):
                x1,y1=pts[i]; x2,y2=pts[(i+1)%n]; mx,my=(x1+x2)/2,(y1+y2)/2
                dx,dy=mx-cx,my-cy; L=math.hypot(dx,dy) or 1; b=.5*math.hypot(x2-x1,y2-y1)
                d+=(f'M{F(x1)} {F(y1)}' if i==0 else '')+f'Q{F(mx+dx/L*b)} {F(my+dy/L*b)} {F(x2)} {F(y2)}'
            return d+'Z'
        nb=bands*2+1
        for k in range(nb):
            sc=1-k*(.86/nb)
            if k%2==0: col,op=s.D,(1 if k==0 else max(.35,1-k*.09))
            else: col,op=(s.A,.55) if k%4==3 else (s.L,1)
            s.o.append(f'<path d="{outline(sc)}" fill="{col}"'+(f' fill-opacity="{op:.2f}"' if op<1 else '')+'/>')
        s.curl(cx-W*1.0,cy+H*.42,H*.38,-.4,1.2,1,H*.09)
        s.curl(cx+W*.95,cy+H*.25,H*.34,math.pi+.4,1.2,-1,H*.09)
    def cecek(s,box,n,seed,r=(1,1.8),avoid=None):
        random.seed(seed)
        for _ in range(n):
            x=random.uniform(box[0],box[2]); y=random.uniform(box[1],box[3])
            if avoid and not avoid(x,y): continue
            k=random.random()
            if k<.6: s.dot(x,y,random.uniform(*r))
            else:
                for i in range(3): a=2*math.pi*i/3; s.dot(x+3.6*math.cos(a),y+3.6*math.sin(a),r[0]*1.1)
    def svg(s,w,h): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'+''.join(s.o)+'</svg>'

def ornament(D,A,L):
    s=Art(D,A,L)
    s.mega(650,610,150,78); s.mega(150,120,92,48,4); s.mega(720,180,80,42,4)
    s.cecek((0,0,900,900),220,5,avoid=lambda x,y: x+y<1150)
    # batang utama menipis + cabang
    main=s.taper([(10,900),(70,760),(110,620),(170,500),(270,400),(390,330),(520,300),(640,230),(740,120)],18,4)
    b1=s.taper([(270,400),(250,300),(300,210),(390,150),(470,150)],9,3)
    b2=s.taper([(170,500),(270,540),(360,610),(400,700),(380,790)],10,3)
    b3=s.taper([(520,300),(560,380),(620,420),(700,420)],7,2.5)
    b4=s.taper([(110,620),(40,560),(30,470),(70,420)],7,2.5)
    for (x,y,R,a,d) in [(470,128,22,math.pi/2,1),(362,800,22,0,-1),(712,402,18,-math.pi/2,1),(88,402,18,math.pi,-1),(752,96,20,math.pi/2,-1)]:
        s.curl(x,y,R,a,1.3,d,4.5)
    # sulur kecil
    for c in [[(390,330),(430,380),(470,380)],[(640,230),(680,270),(720,260)],[(70,760),(130,780),(160,760)],[(300,210),(260,170),(240,120)]]:
        s.taper(c,3.2,1); s.curl(c[-1][0],c[-1][1]-10,10,math.pi/2,1.1,1,2.6)
    # daun
    for (x,y,a,Lf,st) in [(60,720,-.9,95,'dark'),(110,640,.9,80,'gold'),(150,520,-1.1,85,'dark'),(220,440,1.2,78,'gold'),(330,355,-1.9,90,'dark'),(450,315,.95,80,'dark'),(590,260,-1.6,76,'gold'),(690,170,1.0,70,'dark'),
                          (260,330,-.8,64,'dark'),(330,180,1.4,60,'gold'),(270,560,1.9,70,'dark'),(370,680,-.5,66,'gold'),(560,390,1.6,58,'dark'),(40,520,-1.2,55,'gold')]:
        s.leaf((x,y),a,Lf*1.3,Lf*.5,.3 if a>0 else -.3,.2 if a>0 else -.2,st)
    # bunga
    s.bloom(300,400,112,6,8)
    s.bloom(470,150,62,5,-15)
    s.bloom(380,790,58,6,20)
    s.bloom(700,420,44,5,0,.45)
    s.bloom(70,420,40,5,30,.45)
    s.bud((740,120),.6,58); s.bud((160,760),1.4,40); s.bud((720,260),1.0,36); s.bud((240,120),-.3,38)
    for (x,y,R) in [(560,520,16),(200,250,14),(470,470,13),(120,330,12),(820,300,12),(270,880,12),(520,810,13),(850,60,11)]:
        s.blossom(x,y,R,x%37)
    return s.svg(900,900)

def tile(D,A,L):
    s=Art(D,A,L)
    s.mega(150,150,64,34,4); s.mega(420,410,58,30,4)
    s.blossom(410,130,16,10); s.blossom(130,410,18,0); s.blossom(280,280,12,20); s.blossom(490,270,9,5); s.blossom(30,290,9,40)
    for (c,cx,cy) in [([(200,230),(240,270),(280,240)],280,230),([(330,350),(300,320),(260,345)],260,335),([(450,170),(470,210),(500,215)],500,205)]:
        s.taper(c,2.6,.8); s.curl(cx,cy,8,0,1.1,1,2)
    s.cecek((0,0,520,520),120,9,(.9,1.5))
    return s.svg(520,520)

out=sys.argv[1]
for name,fn,cols in [('batik-ornamen.svg',ornament,('#0B5843','#B8914F','#F7F0E2')),('batik-ornamen-light.svg',ornament,('#F5EDDF','#D6B57A','#0E5A46')),
                     ('batik.svg',tile,('#0B5843','#B8914F','#F7F0E2')),('batik-light.svg',tile,('#F5EDDF','#D6B57A','#0E5A46'))]:
    open(os.path.join(out,name),'w').write(fn(*cols))
