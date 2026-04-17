"""
EMEE-Z (JuriAlvo WhatsApp Inbox) — product showcase poster
Philosophy: Tactical Quietude / Meridian Void
Output: 1920x1080 PNG, 3 screens (Login / Agent Inbox / Manager Dashboard)
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

# ------------------------------------------------------------------ paths
FONTS = Path("/Users/marianesoares/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/2332b873-2315-4958-a7e2-ad22c8b8e234/d045e728-351b-4c87-aafd-bc9f256aea66/skills/canvas-design/canvas-fonts")
OUT   = Path("/Users/marianesoares/Desktop/EMEVEE-Z/design-output/emee-z-poster.png")

# ------------------------------------------------------------------ palette
NAVY_DEEP   = (10, 14, 26)       # #0A0E1A page
NAVY_MID    = (17, 24, 39)       # #111827 surface
NAVY_CARD   = (22, 29, 46)       # #161D2E card
NAVY_CARD_2 = (28, 36, 56)       # elevated
NAVY_BORDER = (30, 42, 66)       # #1E2A42
NAVY_BORDER_SOFT = (24, 33, 52)
TEAL        = (0, 198, 162)      # #00C6A2
TEAL_DIM    = (0, 149, 122)      # hover
AMBER       = (245, 158, 11)
RED         = (239, 68, 68)
BLUE        = (59, 130, 246)
WHITE_PRI   = (240, 244, 255)    # text primary
WHITE_MUTE  = (138, 155, 191)    # muted
WHITE_FAINT = (58, 75, 107)      # placeholder

# ------------------------------------------------------------------ fonts
def F(name, size):
    p = FONTS / name
    return ImageFont.truetype(str(p), size)

# Substitutes: BricolageGrotesque for Space Grotesk; JetBrainsMono for Space Mono
H_REG = lambda s: F("BricolageGrotesque-Regular.ttf", s)
H_BOLD = lambda s: F("BricolageGrotesque-Bold.ttf", s)
M_REG = lambda s: F("JetBrainsMono-Regular.ttf", s)
M_BOLD = lambda s: F("JetBrainsMono-Bold.ttf", s)

# ------------------------------------------------------------------ canvas
W, H = 1920, 1080
img = Image.new("RGB", (W, H), NAVY_DEEP)
d = ImageDraw.Draw(img, "RGBA")

# subtle dot grid background
for x in range(0, W, 32):
    for y in range(0, H, 32):
        d.point((x, y), fill=(30, 42, 66, 255))

# ------------------------------------------------------------------ helpers
def rrect(xy, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)

def text(xy, s, font, fill=WHITE_PRI, anchor="la"):
    d.text(xy, s, font=font, fill=fill, anchor=anchor)

def hline(x1, x2, y, color=NAVY_BORDER, width=1):
    d.line([(x1, y), (x2, y)], fill=color, width=width)

def vline(x, y1, y2, color=NAVY_BORDER, width=1):
    d.line([(x, y1), (x, y2)], fill=color, width=width)

# crosshair logo
def crosshair(cx, cy, r, color=TEAL, weight=2):
    d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=color, width=weight)
    inner = int(r*0.42)
    d.ellipse([cx-inner, cy-inner, cx+inner, cy+inner], outline=(*color, 140), width=1)
    dot = max(2, int(r*0.18))
    d.ellipse([cx-dot, cy-dot, cx+dot, cy+dot], fill=color)
    arm = int(r*0.55)
    gap = int(r*1.05)
    d.line([(cx-gap-arm, cy),(cx-gap, cy)], fill=color, width=weight)
    d.line([(cx+gap, cy),(cx+gap+arm, cy)], fill=color, width=weight)
    d.line([(cx, cy-gap-arm),(cx, cy-gap)], fill=color, width=weight)
    d.line([(cx, cy+gap),(cx, cy+gap+arm)], fill=color, width=weight)

# =================================================================== HEADER
HDR_Y = 50
crosshair(80, HDR_Y+18, 18, TEAL, 2)
text((116, HDR_Y), "JuriAlvo", H_BOLD(28), WHITE_PRI)
tw = d.textlength("JuriAlvo", H_BOLD(28))
text((116+tw+2, HDR_Y-4), "™", H_REG(14), TEAL)
text((116, HDR_Y+34), "EMEE-Z  ·  WHATSAPP INBOX MANAGEMENT", M_REG(11), WHITE_MUTE)

# right header — stamp
text((W-80, HDR_Y), "PRODUCT SHOWCASE / 2026", M_REG(11), WHITE_MUTE, anchor="ra")
text((W-80, HDR_Y+18), "v.1.0  ·  TACTICAL QUIETUDE", M_REG(11), TEAL, anchor="ra")
text((W-80, HDR_Y+36), "001 — 003 / 003", M_REG(11), WHITE_FAINT, anchor="ra")

hline(80, W-80, 110, NAVY_BORDER)

# ---- subtitle row
text((80, 130), "Three Views of a Working Instrument", H_REG(20), WHITE_PRI)
text((80, 160), "Login · Agent Inbox · Manager Dashboard", M_REG(12), WHITE_MUTE)

# tiny coordinate annotations on header rule
for i, x in enumerate(range(200, W-80, 240)):
    d.line([(x, 108), (x, 114)], fill=NAVY_BORDER, width=1)

# =================================================================== PANELS
PANEL_Y = 210
PANEL_H = 760
GUTTER = 32
P1_X, P1_W = 80, 460          # Login
P2_X, P2_W = P1_X + P1_W + GUTTER, 760   # Inbox  -> 552
P3_X, P3_W = P2_X + 760 + GUTTER, 528    # Dashboard

# panel frame + label
def panel(x, w, code, title):
    # outer hairline frame
    rrect((x, PANEL_Y, x+w, PANEL_Y+PANEL_H), 14,
          fill=NAVY_MID, outline=NAVY_BORDER, width=1)
    # label band above
    text((x, PANEL_Y-34), code, M_BOLD(11), TEAL)
    text((x+50, PANEL_Y-34), title, M_REG(11), WHITE_MUTE)
    # corner ticks
    for cx, cy in [(x, PANEL_Y), (x+w, PANEL_Y), (x, PANEL_Y+PANEL_H), (x+w, PANEL_Y+PANEL_H)]:
        d.line([(cx-6, cy),(cx+6, cy)], fill=TEAL, width=1)
        d.line([(cx, cy-6),(cx, cy+6)], fill=TEAL, width=1)

panel(P1_X, P1_W, "001", "AUTHENTICATION  ·  /login")
panel(P2_X, 760,  "002", "AGENT INBOX  ·  /inbox")
panel(P3_X, P3_W, "003", "MANAGER DASHBOARD  ·  /dashboard")

# =================================================================== 001 LOGIN
x, y, w = P1_X, PANEL_Y, P1_W
inner_pad = 28

# top mini chrome bar (window dots)
for i, c in enumerate([(255,95,86),(255,189,46),(39,201,63)]):
    d.ellipse([x+18+i*16, y+18, x+18+i*16+8, y+26], fill=c)
text((x+w-18, y+22), "emee-z.app", M_REG(10), WHITE_FAINT, anchor="ra")
hline(x, x+w, y+44, NAVY_BORDER_SOFT)

# subtle radial dot field inside login
for px in range(x+10, x+w-10, 22):
    for py in range(y+60, y+PANEL_H-10, 22):
        d.point((px, py), fill=(28, 38, 60, 255))

# centered login card
cx = x + w//2
card_w, card_h = 360, 480
cy_top = y + 110
rrect((cx-card_w//2, cy_top, cx+card_w//2, cy_top+card_h), 16,
      fill=NAVY_CARD, outline=NAVY_BORDER, width=1)

# logo inside card
crosshair(cx, cy_top+60, 22, TEAL, 2)
text((cx, cy_top+96), "JuriAlvo", H_BOLD(24), WHITE_PRI, anchor="ma")
text((cx, cy_top+126), "GESTÃO DE WHATSAPP", M_REG(10), TEAL, anchor="ma")
hline(cx-40, cx+40, cy_top+148, NAVY_BORDER)

# fields
def field(label, value, y0, focused=False):
    text((cx-card_w//2+24, y0), label, M_REG(10), WHITE_MUTE)
    fy = y0 + 18
    fx1, fx2 = cx-card_w//2+24, cx+card_w//2-24
    border = TEAL if focused else NAVY_BORDER
    rrect((fx1, fy, fx2, fy+44), 10, fill=NAVY_DEEP, outline=border, width=1)
    text((fx1+14, fy+13), value, H_REG(13),
         WHITE_PRI if value and not value.startswith("•") else WHITE_FAINT)
    if focused:
        # focus ring
        rrect((fx1-2, fy-2, fx2+2, fy+46), 12, outline=(0,198,162,90), width=2)

field("E-MAIL",  "agente@jurialvo.com", cy_top+170, focused=False)
field("SENHA",   "••••••••••••",         cy_top+240, focused=True)

# submit button (teal)
by1 = cy_top+316
bx1, bx2 = cx-card_w//2+24, cx+card_w//2-24
rrect((bx1, by1, bx2, by1+46), 10, fill=TEAL)
text(((bx1+bx2)//2, by1+13), "Entrar", H_BOLD(14), NAVY_DEEP, anchor="ma")
# small arrow
ax = bx2-22; ay = by1+23
d.line([(ax-8, ay),(ax, ay)], fill=NAVY_DEEP, width=2)
d.line([(ax-3, ay-4),(ax, ay)], fill=NAVY_DEEP, width=2)
d.line([(ax-3, ay+4),(ax, ay)], fill=NAVY_DEEP, width=2)

# divider
hline(bx1, bx2, by1+78, NAVY_BORDER)
text((cx, by1+92), "ACESSO RESTRITO", M_REG(10), WHITE_FAINT, anchor="ma")
text((cx, by1+110), "Solicite ao administrador", H_REG(11), WHITE_MUTE, anchor="ma")

# footer code
text((x+inner_pad, y+PANEL_H-30), "AUTH/SSO READY", M_REG(10), WHITE_FAINT)
text((x+w-inner_pad, y+PANEL_H-30), "256-BIT TLS", M_REG(10), WHITE_FAINT, anchor="ra")

# =================================================================== 002 INBOX
x, y, w = P2_X, PANEL_Y, 760

# topbar
hline(x, x+w, y+52, NAVY_BORDER_SOFT)
text((x+24, y+22), "Caixa de Entrada", H_BOLD(16), WHITE_PRI)
text((x+24, y+42), "37 ATIVAS  ·  4 AGUARDANDO  ·  12 ENCERRADAS HOJE",
     M_REG(10), WHITE_MUTE)
# search pill
rrect((x+w-280, y+18, x+w-24, y+46), 8, fill=NAVY_DEEP, outline=NAVY_BORDER)
text((x+w-268, y+25), "⌕  buscar contato, telefone…", M_REG(11), WHITE_FAINT)

# left sidebar (conversation list)
SB_W = 270
SB_X = x
SB_Y = y+52
SB_H = PANEL_H - 52
vline(SB_X+SB_W, SB_Y, SB_Y+SB_H, NAVY_BORDER_SOFT)

# filter tabs
tabs = [("Todas", True), ("Aguardando", False), ("Minhas", False)]
tx = SB_X + 16
for label, active in tabs:
    tw_ = int(d.textlength(label, M_REG(11))) + 22
    if active:
        rrect((tx, SB_Y+12, tx+tw_, SB_Y+34), 6, fill=NAVY_CARD_2, outline=NAVY_BORDER)
        text((tx+tw_//2, SB_Y+18), label, M_BOLD(11), TEAL, anchor="ma")
    else:
        text((tx+tw_//2, SB_Y+18), label, M_REG(11), WHITE_MUTE, anchor="ma")
    tx += tw_ + 8

# convo entries
convos = [
    ("CR", "Carla Ribeiro", "+55 11 9 8821-4502",
     "Bom dia, recebi o boleto mas ainda…", "09:14", 2, "ativa", True),
    ("MA", "Mauro Antunes", "+55 21 9 7723-0118",
     "Pode mandar o contrato em PDF?",      "09:08", 0, "aguardando", False),
    ("LF", "Luiza Ferraz",  "+55 31 9 8014-9921",
     "Perfeito, fechado então.",            "08:55", 0, "ativa", False),
    ("RD", "Ricardo Domus", "+55 11 9 9034-7720",
     "Vou conversar com meu sócio e…",      "08:32", 0, "ativa", False),
    ("VS", "Vivian Souto",  "+55 51 9 8881-3340",
     "Obrigada pelo retorno!",              "ontem", 0, "encerrado", False),
    ("PE", "Pedro Esteves", "+55 11 9 7720-5511",
     "Enviei o documento agora.",           "ontem", 1, "ativa", False),
    ("AN", "Ana Negri",     "+55 27 9 9712-0044",
     "Quanto fica o serviço completo?",     "ontem", 0, "aguardando", False),
]

cy = SB_Y + 56
for ini, nome, tel, prev, hora, unread, status, active in convos:
    row_h = 78
    if active:
        rrect((SB_X+8, cy, SB_X+SB_W-8, cy+row_h), 10, fill=NAVY_CARD_2)
        # left teal bar
        d.rectangle([SB_X+8, cy+8, SB_X+11, cy+row_h-8], fill=TEAL)
    # avatar
    av_x, av_y = SB_X+22, cy+14
    d.ellipse([av_x, av_y, av_x+40, av_y+40], fill=NAVY_CARD)
    text((av_x+20, av_y+12), ini, H_BOLD(13), TEAL, anchor="ma")
    # name + time
    text((av_x+52, cy+14), nome, H_BOLD(13), WHITE_PRI)
    text((SB_X+SB_W-22, cy+14), hora, M_REG(10), WHITE_MUTE, anchor="ra")
    # phone (mono)
    text((av_x+52, cy+32), tel, M_REG(10), WHITE_MUTE)
    # preview
    text((av_x+52, cy+50), prev[:34] + ("…" if len(prev) > 34 else ""),
         H_REG(11), WHITE_MUTE)
    # status / unread
    if unread:
        bx = SB_X+SB_W-30
        d.ellipse([bx, cy+34, bx+18, cy+52], fill=TEAL)
        text((bx+9, cy+38), str(unread), M_BOLD(10), NAVY_DEEP, anchor="ma")
    else:
        if status == "aguardando":
            rrect((SB_X+SB_W-86, cy+38, SB_X+SB_W-24, cy+54), 8,
                  fill=(245,158,11,40), outline=AMBER, width=1)
            text((SB_X+SB_W-55, cy+42), "AGUARDA", M_BOLD(8), AMBER, anchor="ma")
        elif status == "encerrado":
            rrect((SB_X+SB_W-86, cy+38, SB_X+SB_W-24, cy+54), 8,
                  fill=(239,68,68,30), outline=RED, width=1)
            text((SB_X+SB_W-55, cy+42), "ENCERR.", M_BOLD(8), RED, anchor="ma")
    hline(SB_X+18, SB_X+SB_W-18, cy+row_h+2, NAVY_BORDER_SOFT)
    cy += row_h + 4
    if cy > SB_Y + SB_H - 80:
        break

# ----- center chat panel
CH_X = SB_X + SB_W
CH_Y = SB_Y
CH_W = w - SB_W - 220  # leave 220 for right info
CH_H = SB_H

# chat header
text((CH_X+22, CH_Y+18), "Carla Ribeiro", H_BOLD(15), WHITE_PRI)
text((CH_X+22, CH_Y+38), "+55 11 9 8821-4502  ·  online agora", M_REG(10), TEAL)
# action icons (small squares)
for i, label in enumerate(["TRANSFERIR", "ENCERRAR", "INFO"]):
    bw = int(d.textlength(label, M_REG(10))) + 18
    bx = CH_X + CH_W - 16 - bw
    if i > 0: bx -= sum(int(d.textlength(l, M_REG(10)))+26 for l in ["TRANSFERIR","ENCERRAR","INFO"][:i])
text((CH_X+CH_W-22, CH_Y+22), "TRANSFERIR  ·  ENCERRAR  ·  ⋯", M_REG(10), WHITE_MUTE, anchor="ra")
hline(CH_X, CH_X+CH_W, CH_Y+58, NAVY_BORDER_SOFT)

# date stamp
text((CH_X+CH_W//2, CH_Y+78), "─  HOJE  ─", M_REG(10), WHITE_FAINT, anchor="ma")

# message bubbles
def bubble(text_str, by, sent=False, time="09:14"):
    pad = 14
    max_w = 360
    font = H_REG(13)
    lines = []
    words = text_str.split(" ")
    line = ""
    for word in words:
        test = (line + " " + word).strip()
        if d.textlength(test, font) > max_w - 2*pad:
            lines.append(line); line = word
        else:
            line = test
    if line: lines.append(line)
    bw_ = max(d.textlength(l, font) for l in lines) + 2*pad
    bh_ = len(lines)*20 + 2*pad
    if sent:
        bx2 = CH_X + CH_W - 24
        bx1 = bx2 - bw_
        rrect((bx1, by, bx2, by+bh_), 12, fill=TEAL)
        for i, l in enumerate(lines):
            text((bx1+pad, by+pad+i*20), l, font, NAVY_DEEP)
        text((bx2-4, by+bh_+4), time + "  ✓✓", M_REG(9), WHITE_FAINT, anchor="ra")
    else:
        bx1 = CH_X + 24
        bx2 = bx1 + bw_
        rrect((bx1, by, bx2, by+bh_), 12, fill=NAVY_CARD_2, outline=NAVY_BORDER)
        for i, l in enumerate(lines):
            text((bx1+pad, by+pad+i*20), l, font, WHITE_PRI)
        text((bx1+4, by+bh_+4), time, M_REG(9), WHITE_FAINT)
    return by + bh_ + 22

bx_y = CH_Y + 100
bx_y = bubble("Bom dia! Recebi o boleto mas ainda não consegui visualizar todos os anexos do contrato.", bx_y, sent=False, time="09:11")
bx_y = bubble("Bom dia, Carla. Vou reenviar agora pelo e-mail e também por aqui em PDF.", bx_y, sent=True, time="09:12")
bx_y = bubble("Perfeito, obrigada! Aproveitando, qual o prazo final para assinatura?", bx_y, sent=False, time="09:13")
bx_y = bubble("Até sexta-feira, 18h. Mas se precisar de mais tempo, me avise.", bx_y, sent=True, time="09:14")

# typing indicator
text((CH_X+24, bx_y), "Carla está digitando", M_REG(10), WHITE_MUTE)
for i in range(3):
    d.ellipse([CH_X+158+i*8, bx_y+4, CH_X+162+i*8, bx_y+8], fill=TEAL if i==0 else WHITE_FAINT)

# input bar
ipy1 = CH_Y + CH_H - 70
hline(CH_X, CH_X+CH_W, ipy1-12, NAVY_BORDER_SOFT)
rrect((CH_X+24, ipy1, CH_X+CH_W-90, ipy1+50), 12,
      fill=NAVY_DEEP, outline=NAVY_BORDER)
text((CH_X+44, ipy1+16), "Escreva sua mensagem…", H_REG(12), WHITE_FAINT)
# attach icon
text((CH_X+CH_W-128, ipy1+15), "⊕  📎", M_REG(13), WHITE_MUTE)
# send button
sx1, sx2 = CH_X+CH_W-72, CH_X+CH_W-24
rrect((sx1, ipy1, sx2, ipy1+50), 12, fill=TEAL)
# arrow
acx, acy = (sx1+sx2)//2, ipy1+25
d.polygon([(acx-6, acy-7),(acx+8, acy),(acx-6, acy+7)], fill=NAVY_DEEP)

# ----- right info panel
RI_X = CH_X + CH_W
RI_W = 220
vline(RI_X, CH_Y, CH_Y+CH_H, NAVY_BORDER_SOFT)
text((RI_X+18, CH_Y+18), "CONTATO", M_BOLD(10), TEAL)

# big avatar
av_cx = RI_X + RI_W//2
d.ellipse([av_cx-30, CH_Y+50, av_cx+30, CH_Y+110], fill=NAVY_CARD_2, outline=TEAL, width=1)
text((av_cx, CH_Y+68), "CR", H_BOLD(20), TEAL, anchor="ma")
text((av_cx, CH_Y+120), "Carla Ribeiro", H_BOLD(13), WHITE_PRI, anchor="ma")
text((av_cx, CH_Y+140), "Cliente recorrente", M_REG(10), WHITE_MUTE, anchor="ma")

# info rows
rows = [
    ("ID",        "#00482-CR"),
    ("TELEFONE",  "+55 11 98821-4502"),
    ("E-MAIL",    "carla.r@adv.br"),
    ("AGENTE",    "Mariane S."),
    ("ABERTURA",  "16/04 · 09:11"),
    ("ETIQUETA",  "Contrato"),
]
ry = CH_Y + 180
for k, v in rows:
    text((RI_X+18, ry), k, M_REG(9), WHITE_MUTE)
    text((RI_X+18, ry+14), v, M_REG(11), WHITE_PRI)
    hline(RI_X+18, RI_X+RI_W-18, ry+38, NAVY_BORDER_SOFT)
    ry += 50

# CRM mini panel
rrect((RI_X+16, ry+10, RI_X+RI_W-16, ry+90), 10, fill=NAVY_CARD_2, outline=NAVY_BORDER)
text((RI_X+28, ry+20), "NEGÓCIO ATIVO", M_BOLD(9), TEAL)
text((RI_X+28, ry+38), "R$ 12.400", M_BOLD(15), WHITE_PRI)
text((RI_X+28, ry+60), "Negociação · 70%", M_REG(10), WHITE_MUTE)
# progress bar
rrect((RI_X+28, ry+78, RI_X+RI_W-28, ry+82), 2, fill=NAVY_BORDER)
pw = int((RI_W-56) * 0.70)
rrect((RI_X+28, ry+78, RI_X+28+pw, ry+82), 2, fill=TEAL)

# =================================================================== 003 DASHBOARD
x, y, w = P3_X, PANEL_Y, P3_W

# top
text((x+24, y+22), "Painel da Gestora", H_BOLD(16), WHITE_PRI)
text((x+24, y+42), "PERÍODO  ·  ÚLTIMOS 30 DIAS", M_REG(10), TEAL)
text((x+w-24, y+22), "AO VIVO", M_BOLD(10), TEAL, anchor="ra")
d.ellipse([x+w-92, y+26, x+w-86, y+32], fill=TEAL)
hline(x, x+w, y+58, NAVY_BORDER_SOFT)

# 4 metric cards (2x2)
def metric(mx, my, mw, mh, label, value, delta, delta_color=TEAL):
    rrect((mx, my, mx+mw, my+mh), 12, fill=NAVY_CARD, outline=NAVY_BORDER)
    text((mx+16, my+14), label, M_BOLD(9), WHITE_MUTE)
    text((mx+16, my+36), value, H_BOLD(28), WHITE_PRI)
    text((mx+16, my+mh-22), delta, M_REG(10), delta_color)
    # micro sparkline
    import random
    random.seed(hash(label) & 0xffff)
    pts = [random.uniform(0.3, 1.0) for _ in range(14)]
    sp_x1 = mx + mw - 110; sp_x2 = mx + mw - 16
    sp_y1 = my + 36; sp_y2 = my + mh - 24
    step = (sp_x2 - sp_x1) / (len(pts)-1)
    line_pts = []
    for i, p in enumerate(pts):
        px = sp_x1 + i*step
        py = sp_y2 - (sp_y2 - sp_y1) * p
        line_pts.append((px, py))
    d.line(line_pts, fill=delta_color, width=2)

m_y = y + 78
m_h = 110
m_pad = 14
m_w = (w - 24*2 - m_pad) // 2

metric(x+24,            m_y,           m_w, m_h, "TOTAL CONVERSAS",        "1.284", "▲ 12.4%  vs anterior", TEAL)
metric(x+24+m_w+m_pad,  m_y,           m_w, m_h, "AGENTES ATIVOS",         "07 / 09", "▲ 1  online agora",   TEAL)
metric(x+24,            m_y+m_h+m_pad, m_w, m_h, "TEMPO MÉDIO RESPOSTA",   "01:42", "▼ 18s  vs anterior",   TEAL)
metric(x+24+m_w+m_pad,  m_y+m_h+m_pad, m_w, m_h, "TAXA DE RESOLUÇÃO",      "87.3%", "▼ 1.2%  meta 90%",     RED)

# chart area
ch_y = m_y + 2*m_h + m_pad + 24
ch_h = 230
rrect((x+24, ch_y, x+w-24, ch_y+ch_h), 12, fill=NAVY_CARD, outline=NAVY_BORDER)
text((x+40, ch_y+16), "VOLUME DE CONVERSAS  ·  ÚLTIMOS 14 DIAS", M_BOLD(10), WHITE_MUTE)
text((x+w-40, ch_y+16), "PICO  09:00 – 11:00", M_REG(10), TEAL, anchor="ra")

# bars
import random
random.seed(7)
bars = [random.uniform(0.35, 1.0) for _ in range(14)]
b_top = ch_y + 50
b_bot = ch_y + ch_h - 36
b_x1  = x + 44
b_x2  = x + w - 44
gap = 8
bw_ = (b_x2 - b_x1 - gap*(len(bars)-1)) / len(bars)
for i, v in enumerate(bars):
    bx1 = int(b_x1 + i*(bw_+gap))
    bx2 = int(bx1 + bw_)
    bh_ = (b_bot - b_top) * v
    by1 = b_bot - bh_
    color = TEAL if i not in (4, 9) else AMBER
    rrect((bx1, by1, bx2, b_bot), 3, fill=color)
    # baseline label
    text(((bx1+bx2)//2, b_bot+8), f"{i+1:02d}", M_REG(8), WHITE_FAINT, anchor="ma")

# horizontal grid
for gy in range(b_top, b_bot, (b_bot-b_top)//4):
    hline(b_x1, b_x2, gy, (24,33,52))

# agent table
tb_y = ch_y + ch_h + 22
text((x+24, tb_y), "STATUS DOS AGENTES", M_BOLD(10), WHITE_MUTE)
text((x+w-24, tb_y), "07 ATIVOS  ·  02 OFFLINE", M_REG(10), WHITE_FAINT, anchor="ra")
hline(x+24, x+w-24, tb_y+18, NAVY_BORDER_SOFT)

agents = [
    ("MS", "Mariane Soares",   "ONLINE",       TEAL,  "12 ativas"),
    ("RC", "Rafaela Coelho",   "ONLINE",       TEAL,  "08 ativas"),
    ("BL", "Bruno Lacerda",    "OCUPADO",      AMBER, "05 ativas"),
    ("JP", "João Pereira",     "OFFLINE",      WHITE_FAINT, "—"),
]
ay = tb_y + 26
for ini, nome, st, c, load in agents:
    # avatar
    d.ellipse([x+30, ay, x+54, ay+24], fill=NAVY_CARD_2)
    text((x+42, ay+5), ini, M_BOLD(10), TEAL, anchor="ma")
    text((x+62, ay+5), nome, H_REG(12), WHITE_PRI)
    # status pill
    sw = int(d.textlength(st, M_BOLD(9))) + 18
    sx_ = x + w - 24 - sw
    rrect((sx_, ay+2, sx_+sw, ay+22), 10, outline=c, width=1)
    text((sx_+sw//2, ay+6), st, M_BOLD(9), c, anchor="ma")
    text((sx_-12, ay+6), load, M_REG(10), WHITE_MUTE, anchor="ra")
    ay += 32

# panel footer
text((x+24, y+PANEL_H-30), "REALTIME · WEBSOCKET", M_REG(10), WHITE_FAINT)
text((x+w-24, y+PANEL_H-30), "EXPORT  ·  CSV / PDF", M_REG(10), WHITE_FAINT, anchor="ra")

# inbox panel footer
text((P2_X+24, PANEL_Y+PANEL_H-30), "WHATSAPP CLOUD API  ·  WEBHOOK", M_REG(10), WHITE_FAINT)
text((P2_X+760-24, PANEL_Y+PANEL_H-30), "E2E ENCRYPTED CHANNEL", M_REG(10), WHITE_FAINT, anchor="ra")

# =================================================================== FOOTER
hline(80, W-80, H-50, NAVY_BORDER)
text((80, H-36), "JURIALVO™  ·  EMEE-Z INBOX SUITE", M_BOLD(10), WHITE_PRI)
text((W//2, H-36), "TACTICAL QUIETUDE  ·  001 — 003 / 003", M_REG(10), WHITE_MUTE, anchor="ma")
text((W-80, H-36), "MERIDIAN VOID  ·  PRECISION INSTRUMENT", M_REG(10), TEAL, anchor="ra")

# tiny corner crosshairs on poster
for cx, cy in [(40, 40),(W-40, 40),(40, H-40),(W-40, H-40)]:
    d.line([(cx-10, cy),(cx+10, cy)], fill=TEAL, width=1)
    d.line([(cx, cy-10),(cx, cy+10)], fill=TEAL, width=1)
    d.ellipse([cx-3, cy-3, cx+3, cy+3], outline=TEAL, width=1)

img.save(OUT, "PNG", optimize=True)
print(f"saved -> {OUT}")
