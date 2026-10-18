"""Synthetic dataset for the Academic Conference Management System (DA3).
Matches the 13-table DA2 schema (PRESENTATION.Mode -> DeliveryMode). Deterministic (seed 42).
Emits: CSVs (one per table), Oracle INSERT script, and DA3-only helper files."""
import csv, random, datetime as dt, os, collections
random.seed(42)
OUT = "/mnt/user-data/outputs/da3_dataset"
D = lambda s: dt.date.fromisoformat(s)

# ---------- reference vocab ----------
AREAS = {  # area -> (keywords, title nouns)
 "Machine Learning": (["Deep Learning","Federated Learning","Transfer Learning","Reinforcement Learning","Explainable AI","Healthcare AI"],
    ["Convolutional Networks","Graph Neural Networks","Transformers","Federated Optimization","Representation Learning","Anomaly Detection"]),
 "Databases": (["Query Optimization","Indexing","Transaction Processing","Graph Databases","Data Cleaning","Vector Search"],
    ["Query Plans","Learned Indexes","Concurrency Control","Join Algorithms","Schema Matching","Approximate Nearest Neighbour Search"]),
 "Distributed Systems": (["Consensus","Cloud Computing","Fault Tolerance","Edge Computing","Stream Processing","Serverless"],
    ["Consensus Protocols","Replicated State Machines","Geo-Distributed Storage","Stream Processors","Serverless Runtimes","Edge Orchestration"]),
 "Security & Privacy": (["Differential Privacy","Blockchain","Intrusion Detection","Cryptography","Access Control"],
    ["Privacy-Preserving Analytics","Smart Contracts","Intrusion Detection","Secure Aggregation","Attribute-Based Access Control"]),
 "NLP": (["Language Models","Machine Translation","Question Answering","Sentiment Analysis","Low-Resource Languages"],
    ["Language Models","Indic Machine Translation","Question Answering","Opinion Mining","Low-Resource Text Classification"]),
}
VERBS = ["Optimizing","Scaling","Rethinking","Towards Efficient","A Study of","Benchmarking","Robust","Adaptive","Lightweight","Learning-Based"]
CTX = ["at Scale","in the Cloud","for Healthcare","on Edge Devices","under Adversarial Settings","for Smart Cities","with Limited Labels",
       "in Practice","for Indian Languages","with Provable Guarantees","in Real-Time Systems",""]
INST = [("IIT Madras","India"),("IIT Delhi","India"),("IIT Bombay","India"),("IISc Bangalore","India"),("VIT Chennai","India"),("VIT Vellore","India"),
 ("Anna University","India"),("NIT Trichy","India"),("BITS Pilani","India"),("IIIT Hyderabad","India"),("MIT","USA"),("Stanford University","USA"),
 ("CMU","USA"),("UC Berkeley","USA"),("University of Toronto","Canada"),("NUS Singapore","Singapore"),("NTU Singapore","Singapore"),
 ("Oxford University","UK"),("ETH Zurich","Switzerland"),("TU Munich","Germany"),("Tsinghua University","China"),("University of Tokyo","Japan"),
 ("KAIST","South Korea"),("University of Melbourne","Australia"),("IIT Kharagpur","India")]
FIRST = "Aarav Aditi Arjun Ananya Karthik Divya Rahul Priya Vikram Meera Suresh Lakshmi Rohan Sneha Naveen Kavya Manish Deepa Ravi Nisha Alice David Elena John Sarah Wei Li Hiroshi Yuki Min-jun Soo-ah Lukas Anna Pierre Sofia Omar Fatima Chen Mei Noah Emma Liam Olivia".split()
LAST = "Kumar Nair Menon Iyer Reddy Sharma Patel Krishnan Raman Subramanian Das Gupta Singh Rao Pillai Smith Petrova Zhang Lee Tanaka Kim Mueller Dubois Rossi Khan Ali Wang Liu Chen Brown Wilson Taylor Anderson".split()

# ---------- conferences / tracks / sessions ----------
CONFS = [  # ConfID, name, year, start, end, venue  (1,2 keep the DA2 values)
 (1,"Intl Conf on AI Research",2026,"2026-11-10","2026-11-12","Chennai"),
 (2,"Natl Conf on Data Systems",2026,"2026-12-05","2026-12-06","Bengaluru"),
 (3,"Intl Conf on AI Research",2025,"2025-11-11","2025-11-13","Hyderabad"),
 (4,"Natl Conf on Data Systems",2025,"2025-12-04","2025-12-05","Pune"),
 (5,"Intl Conf on AI Research",2024,"2024-11-12","2024-11-14","Delhi"),
]
CONF_AREAS = {1:["Machine Learning","Databases","NLP","Security & Privacy"],2:["Distributed Systems","Databases","Security & Privacy"],
              3:["Machine Learning","NLP","Databases","Security & Privacy"],4:["Distributed Systems","Databases","Security & Privacy"],
              5:["Machine Learning","NLP","Databases"]}
tracks, track_area, sessions = [], {}, []
tid = 1
for c in CONFS:
    for a in CONF_AREAS[c[0]]:
        tracks.append((tid, a, f"{a} research track", c[0])); track_area[tid]=a; tid+=1
sid = 1
for c in CONFS:
    days = (D(c[4])-D(c[3])).days+1
    for k in range(8):
        d = D(c[3])+dt.timedelta(days=k%days)
        st = ["09:00","11:30","14:00","16:00"][(k//days)%4]
        en = {"09:00":"11:00","11:30":"13:30","14:00":"16:00","16:00":"18:00"}[st]
        sessions.append((sid,f"Session {k+1}",d.isoformat(),st,en,f"Hall {'ABCD'[k%4]}",c[0])); sid+=1

# ---------- authors ----------
used=set(); authors=[]; 
for i in range(1,151):
    while True:
        f,l=random.choice(FIRST),random.choice(LAST)
        em=f"{f}.{l}".lower().replace("-","")+("" if f"{f}.{l}" not in used else str(i))
        if f"{f}.{l}" not in used: used.add(f"{f}.{l}"); break
    inst,ctry=random.choice(INST)
    dom = {"India":"ac.in","USA":"edu","Canada":"ca","Singapore":"edu.sg","UK":"ac.uk","Switzerland":"ch","Germany":"de","China":"edu.cn","Japan":"ac.jp","South Korea":"ac.kr","Australia":"edu.au"}[ctry]
    authors.append([i,f"{f} {l}",inst,f"{f}.{l}".lower().replace("-","")+f"@{inst.split()[0].lower()}.{dom}",ctry])
# author research area (drives co-author clusters) + a few hubs
a_area = {a[0]:random.choice(list(AREAS)) for a in authors}
by_area = collections.defaultdict(list)
for aid,ar in a_area.items(): by_area[ar].append(aid)
hubs = {aid for ar in AREAS for aid in by_area[ar][:2]}   # 2 prolific hubs per area
isolated = [authors[-1][0], authors[-2][0]]               # authors with no papers (graph edge case)

# ---------- reviewers ----------
reviewers=[]; rv_area={}
overlap_authors = random.sample([a for a in authors if a[0] not in isolated], 10)   # reviewers who are ALSO authors
for i,a in enumerate(overlap_authors,1):
    ar=a_area[a[0]]; reviewers.append([i,"Dr. "+a[1],a[2],a[3],ar,a[4]]); rv_area[i]=ar
rid=len(reviewers)+1
while len(reviewers)<45:
    f,l=random.choice(FIRST),random.choice(LAST); inst,ctry=random.choice(INST); ar=random.choice(list(AREAS))
    em=f"{f}.{l}.rev".lower().replace("-","")+f"@{inst.split()[0].lower()}.org"
    if any(r[3]==em for r in reviewers): continue
    reviewers.append([rid,f"Dr. {f} {l}",inst,em,ar,ctry]); rv_area[rid]=ar; rid+=1
unassigned_rev = {44,45}   # reviewers who never get work (edge case, like Dr. John Lee in DA2)

# ---------- papers ----------
NPAPERS = {1:22,2:14,3:26,4:18,5:30}
papers=[]; pid=1; paper_area={}
for c in CONFS:
    cid=c[0]; trk=[t for t in tracks if t[3]==cid]
    for _ in range(NPAPERS[cid]):
        t=random.choice(trk); ar=t[1]; kw,nouns=AREAS[ar]
        title=f"{random.choice(VERBS)} {random.choice(nouns)} {random.choice(CTX)}".strip()
        while any(p[1]==title for p in papers): title=f"{random.choice(VERBS)} {random.choice(nouns)} {random.choice(CTX)}".strip()
        sub=D(c[3])-dt.timedelta(days=random.randint(60,95))
        papers.append([pid,title,f"This paper studies {random.choice(kw).lower()} and proposes an approach evaluated on public benchmarks.",cid,t[0],"Submitted",sub.isoformat()])
        paper_area[pid]=ar; pid+=1

# ---------- paper_author ----------
paper_author=[]; pa_map=collections.defaultdict(list)
for p in papers:
    ar=paper_area[p[0]]; pool=[a for a in by_area[ar] if a not in isolated]
    n=random.choices([1,2,3,4,5],[8,32,35,17,8])[0]
    team=[]
    if random.random()<0.55: team.append(random.choice([h for h in hubs if a_area[h]==ar]))
    while len(team)<n:
        cand=random.choice(pool if random.random()<0.85 else [a[0] for a in authors if a[0] not in isolated])
        if cand not in team: team.append(cand)
    random.shuffle(team)
    for o,a in enumerate(team,1): paper_author.append([p[0],a,o,"Y" if o==1 else "N"])
    pa_map[p[0]]=team

# ---------- assignments & reviews ----------
email_of_rev={r[0]:r[3] for r in reviewers}; author_email={a[0]:a[3] for a in authors}
def conflict(paper,rv): return any(author_email[a]==email_of_rev[rv] for a in pa_map[paper])
paper_reviewer=[]; review=[]; reviews_by_paper=collections.defaultdict(list); rvid=1
latent={p[0]:random.gauss(6.8,1.6) for p in papers}
no_assign_papers={papers[-1][0], papers[-2][0]}          # newest 2026 submissions: no reviewers yet
pending_prob=lambda cid: 0.30 if cid in (1,2) else 0.0   # only upcoming confs have pending reviews
def comment(s):
    if s>=9: return random.choice(["Excellent contribution, clearly written and well evaluated.","Strong results and a convincing evaluation. Strong accept."])
    if s>=7: return random.choice(["Solid methodology; a few presentation issues to fix.","Good idea, needs a few more baselines."])
    if s>=5: return random.choice(["Interesting but evaluation is limited.","Needs clearer motivation and more experiments."])
    return random.choice(["Insufficient novelty and weak evaluation.","Major flaws in the experimental setup."])
def rec(s): return "Accept" if s>=8 else "Minor Revision" if s>=7 else "Major Revision" if s>=5 else "Reject"
for p in papers:
    pid_=p[0]
    if pid_ in no_assign_papers: continue
    ar=paper_area[pid_]
    pool=[r for r in rv_area if r not in unassigned_rev and not conflict(pid_,r)]
    same=[r for r in pool if rv_area[r]==ar]; other=[r for r in pool if rv_area[r]!=ar]
    k=random.choice([2,3,3])
    chosen=random.sample(same,min(len(same),k-1))
    while len(chosen)<k: 
        c=random.choice(other+same)
        if c not in chosen: chosen.append(c)
    sub=D(p[6]); 
    for rv in chosen:
        ad=sub+dt.timedelta(days=random.randint(3,8)); paper_reviewer.append([pid_,rv,ad.isoformat()])
        if random.random()<pending_prob(p[3]): continue
        s=max(0,min(10,round(latent[pid_]+random.gauss(0,1.0))))
        rd=ad+dt.timedelta(days=random.randint(5,20))
        review.append([rvid,pid_,rv,s,comment(s),rd.isoformat(),rec(s)]); reviews_by_paper[pid_].append(s); rvid+=1
# ---------- status (same rules as DA2 trigger: any score>=9 and not Rejected -> Accepted) ----------
for p in papers:
    sc=reviews_by_paper[p[0]]; n_assigned=sum(1 for x in paper_reviewer if x[0]==p[0])
    if not sc: p[5]="Submitted"; continue
    avg=sum(sc)/len(sc); complete=len(sc)==n_assigned
    if p[3] in (3,4,5) or complete:
        p[5]="Accepted" if avg>=6.8 else "Rejected"
    else: p[5]="Under Review"
    if max(sc)>=9 and p[5]!="Rejected": p[5]="Accepted"
# ---------- submission / keywords ----------
SRC=["EasyChair","CMT","OpenReview","HotCRP"]
submission=[[i,p[0],pa_map[p[0]][0],p[6],"Received",random.choice(SRC)] for i,p in enumerate(papers,1)]
kw_all=[]; 
for a in AREAS.values(): kw_all+=a[0]
kw_all=sorted(set(kw_all)); keywords=[[i,k] for i,k in enumerate(kw_all,1)]; kw_id={k:i for i,k in keywords[::1] for k in [k]} 
kw_id={k:i for i,k in keywords}
paper_keyword=[]
for p in papers:
    own=AREAS[paper_area[p[0]]][0]; pick=random.sample(own,random.randint(2,3))
    if random.random()<0.3: pick.append(random.choice(kw_all))
    for k in sorted(set(pick)): paper_keyword.append([p[0],kw_id[k]])
# ---------- presentations (accepted papers -> sessions of their conference) ----------
presentations=[]; pres_paper=[]; slot=collections.defaultdict(int); pr=1
def mins(t): h,m=t.split(":"); return int(h)*60+int(m)
def hhmm(x): return f"{x//60:02d}:{x%60:02d}"
for p in [p for p in papers if p[5]=="Accepted"]:
    ss=[s for s in sessions if s[6]==p[3]]
    s=min(ss,key=lambda s:slot[s[0]]); n=slot[s[0]]; slot[s[0]]+=1
    st=mins(s[3])+15*n; mode="Online" if random.random()<0.25 else "Offline"
    presentations.append([pr,s[0],hhmm(st),hhmm(st+15),mode]); pres_paper.append([pr,p[0]]); pr+=1
# conflict-of-interest demo pairs (these MUST be rejected by sp_assign_reviewer / trg_no_self_review)
coi=[[pa,rv] for pa in sorted(pa_map) for rv in rv_area if conflict(pa,rv)][:8]

# ---------- write CSVs ----------
def w(name,hdr,rows):
    with open(f"{OUT}/{name}.csv","w",newline="",encoding="utf-8") as f:
        c=csv.writer(f); c.writerow(hdr); c.writerows(rows)
w("conference",["ConfID","Name","Year","StartDate","EndDate","Venue"],CONFS)
w("track",["TrackID","TrackName","Description","ConfID"],tracks)
w("session_tbl",["SessionID","SessionName","SessionDate","StartTime","EndTime","Room","ConfID"],sessions)
w("author",["AuthorID","Name","Affiliation","Email","Country"],authors)
w("reviewer",["ReviewerID","Name","Affiliation","Email","Expertise","Country"],reviewers)
w("paper",["PaperID","Title","Abstract","ConfID","TrackID","Status","SubmissionDate"],papers)
w("paper_author",["PaperID","AuthorID","AuthorOrder","IsCorresponding"],paper_author)
w("paper_reviewer",["PaperID","ReviewerID","AssignedDate"],paper_reviewer)
w("review",["ReviewID","PaperID","ReviewerID","Score","Comments","ReviewDate","Recommendation"],review)
w("submission",["SubmissionID","PaperID","SubmittedBy","SubmissionDate","Status","Source"],submission)
w("keyword",["KeywordID","Keyword"],keywords)
w("paper_keyword",["PaperID","KeywordID"],paper_keyword)
w("presentation",["PresentationID","SessionID","StartTime","EndTime","DeliveryMode"],presentations)
w("da3_presentation_paper",["PresentationID","PaperID"],pres_paper)
w("da3_coi_test_pairs",["PaperID","ReviewerID"],coi)

# ---------- Oracle INSERT script ----------
q=lambda s:"'"+str(s).replace("'","''")+"'"
dq=lambda s:f"DATE '{s}'"
L=["-- Oracle load script for the DA3 dataset (same data as the CSVs). Run as user ACADEMIC AFTER 01_schema.sql.",
   "-- IMPORTANT: the data contains the ampersand character (Security and Privacy track); without the next line SQL*Plus asks for substitution values",
   "SET DEFINE OFF",
   "SET SQLBLANKLINES ON",
   "SET FEEDBACK OFF",
   "-- The block below clears any earlier sample rows.",
   "DELETE FROM PRESENTATION; DELETE FROM PAPER_KEYWORD; DELETE FROM KEYWORD; DELETE FROM SUBMISSION; DELETE FROM REVIEW;",
   "DELETE FROM PAPER_REVIEWER; DELETE FROM PAPER_AUTHOR; DELETE FROM PAPER; DELETE FROM REVIEWER; DELETE FROM AUTHOR;",
   "DELETE FROM SESSION_TBL; DELETE FROM TRACK; DELETE FROM CONFERENCE;",""]
def ins(t,cols,rows,fmt):
    for r in rows: L.append(f"INSERT INTO {t} ({cols}) VALUES ({fmt(r)});")
ins("CONFERENCE","ConfID,Name,Year,StartDate,EndDate,Venue",CONFS,lambda r:f"{r[0]},{q(r[1])},{r[2]},{dq(r[3])},{dq(r[4])},{q(r[5])}")
ins("TRACK","TrackID,TrackName,Description,ConfID",tracks,lambda r:f"{r[0]},{q(r[1])},{q(r[2])},{r[3]}")
ins("SESSION_TBL","SessionID,SessionName,SessionDate,StartTime,EndTime,Room,ConfID",sessions,lambda r:f"{r[0]},{q(r[1])},{dq(r[2])},{q(r[3])},{q(r[4])},{q(r[5])},{r[6]}")
ins("AUTHOR","AuthorID,Name,Affiliation,Email,Country",authors,lambda r:f"{r[0]},{q(r[1])},{q(r[2])},{q(r[3])},{q(r[4])}")
ins("REVIEWER","ReviewerID,Name,Affiliation,Email,Expertise,Country",reviewers,lambda r:f"{r[0]},{q(r[1])},{q(r[2])},{q(r[3])},{q(r[4])},{q(r[5])}")
ins("PAPER","PaperID,Title,Abstract,ConfID,TrackID,Status,SubmissionDate",papers,lambda r:f"{r[0]},{q(r[1])},{q(r[2])},{r[3]},{r[4]},{q(r[5])},{dq(r[6])}")
ins("PAPER_AUTHOR","PaperID,AuthorID,AuthorOrder,IsCorresponding",paper_author,lambda r:f"{r[0]},{r[1]},{r[2]},{q(r[3])}")
L.append("-- trg_no_self_review will fire on these inserts; none of them is a conflict")
ins("PAPER_REVIEWER","PaperID,ReviewerID,AssignedDate",paper_reviewer,lambda r:f"{r[0]},{r[1]},{dq(r[2])}")
L.append("-- NOTE: trg_flag_paper fires on score>=9 and may set Status='Accepted'; statuses were generated to agree with that rule")
ins("REVIEW","ReviewID,PaperID,ReviewerID,Score,Comments,ReviewDate,Recommendation",review,lambda r:f"{r[0]},{r[1]},{r[2]},{r[3]},{q(r[4])},{dq(r[5])},{q(r[6])}")
ins("SUBMISSION","SubmissionID,PaperID,SubmittedBy,SubmissionDate,Status,Source",submission,lambda r:f"{r[0]},{r[1]},{r[2]},{dq(r[3])},{q(r[4])},{q(r[5])}")
ins("KEYWORD","KeywordID,Keyword",keywords,lambda r:f"{r[0]},{q(r[1])}")
ins("PAPER_KEYWORD","PaperID,KeywordID",paper_keyword,lambda r:f"{r[0]},{r[1]}")
ins("PRESENTATION","PresentationID,SessionID,StartTime,EndTime,DeliveryMode",presentations,lambda r:f"{r[0]},{r[1]},{q(r[2])},{q(r[3])},{q(r[4])}")
L+=["COMMIT;","SET FEEDBACK ON","-- Sequences are created in 01_schema.sql with start values AFTER the ids used here, so sp_add_paper will not collide."]
open(f"{OUT}/oracle_load.sql","w").write("\n".join(L)+"\n")

# ---------- stats ----------
print({n:len(x) for n,x in dict(conf=CONFS,track=tracks,session=sessions,author=authors,reviewer=reviewers,paper=papers,
  paper_author=paper_author,paper_reviewer=paper_reviewer,review=review,submission=submission,keyword=keywords,
  paper_keyword=paper_keyword,presentation=presentations,coi_pairs=coi).items()})
print(collections.Counter(p[5] for p in papers))
print("papers w/o reviewers:",len(no_assign_papers),"| pending reviews:",len(paper_reviewer)-len(review))
print("reviewer workloads (min/max):",min(collections.Counter(x[1] for x in paper_reviewer).values()),max(collections.Counter(x[1] for x in paper_reviewer).values()))
print("unassigned reviewers:",[r for r in rv_area if r not in {x[1] for x in paper_reviewer}])
print("authors w/o papers:",len({a[0] for a in authors}-{x[1] for x in paper_author}))
