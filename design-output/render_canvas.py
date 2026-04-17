#!/usr/bin/env python3
"""
EMEE-Z / JuriAlvo™ — Design Canvas Generator
Meridian Void philosophy: surgical precision within deep darkness
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# ─── PATHS ────────────────────────────────────────────────────────────────────
FONTS_DIR = "/Users/marianesoares/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/2332b873-2315-4958-a7e2-ad22c8b8e234/d045e728-351b-4c87-aafd-bc9f256aea66/skills/canvas-design/canvas-fonts"
OUTPUT = "/Users/marianesoares/Desktop/EMEVEE-Z/design-output/emee-z-design.png"

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS_DIR, name), size)

# ─── COLOR TOKENS ─────────────────────────────────────────────────────────────
C = {
    "navy_deep":    (10,  14,  26),
    "navy_mid":     (17,  24,  39),
    "navy_card":    (22,  29,  46),
    "navy_border":  (30,  42,  66),
    "teal":         (0,   198, 162),
    "teal_dim":     (0,   149, 122),
    "amber":        (245, 158, 11),
    "red":          (239, 68,  68),
    "blue":         (59,  130, 246),
    "white":        (240, 244, 255),
    "muted":        (138, 155, 191),
    "faint":        (58,  75,  107),
    "border_line":  (30,  42,  66),
}

def rgba(name, a=255):
    r, g, b = C[name]
    return (r, g, b, a)

# ─── CANVAS SETUP ─────────────────────────────────────────────────────────────
W, H = 1920, 1080
canvas = Image.new("RGB", (W, H), C["navy_deep"])
draw = ImageDraw.Draw(canvas, "RGBA")

# ─── FONTS ────────────────────────────────────────────────────────────────────
f_display   = font("BricolageGrotesque-Bold.ttf", 52)
f_title     = font("BricolageGrotesque-Bold.ttf", 22)
f_title_md  = font("BricolageGrotesque-Bold.ttf", 17)
f_title_sm  = font("BricolageGrotesque-Bold.ttf", 15)
f_body      = font("BricolageGrotesque-Regular.ttf", 13)
f_body_sm   = font("BricolageGrotesque-Regular.ttf", 11)
f_mono_xl   = font("GeistMono-Bold.ttf", 36)
f_mono_lg   = font("GeistMono-Bold.ttf", 28)
f_mono      = font("GeistMono-Regular.ttf", 12)
f_mono_sm   = font("GeistMono-Regular.ttf", 10)
f_mono_bold = font("GeistMono-Bold.ttf", 13)
f_label     = font("GeistMono-Regular.ttf", 9)
f_label_bold= font("GeistMono-Bold.ttf", 9)

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def rect(x, y, w, h, color, alpha=255):
    r, g, b = color
    draw.rectangle([x, y, x+w, y+h], fill=(r, g, b, alpha))

def border_rect(x, y, w, h, fill_color, border_color, fill_alpha=255, border_alpha=80, bw=1):
    rect(x, y, w, h, fill_color, fill_alpha)
    r, g, b = border_color
    draw.rectangle([x, y, x+w, y+h], outline=(r, g, b, border_alpha), width=bw)

def text_c(txt, x, y, fnt, color, alpha=255, anchor="lt"):
    r, g, b = color
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.text((x, y), txt, font=fnt, fill=(r, g, b, alpha), anchor=anchor)
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

def line(x1, y1, x2, y2, color, alpha=40, w=1):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    r, g, b = color
    od.line([(x1, y1), (x2, y2)], fill=(r, g, b, alpha), width=w)
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

def dot(x, y, r, color, alpha=255):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    rv, gv, bv = color
    od.ellipse([x-r, y-r, x+r, y+r], fill=(rv, gv, bv, alpha))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

def circle_outline(x, y, r, color, alpha=80, w=1):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    rv, gv, bv = color
    od.ellipse([x-r, y-r, x+r, y+r], outline=(rv, gv, bv, alpha), width=w)
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

def text_width(txt, fnt):
    bbox = fnt.getbbox(txt)
    return bbox[2] - bbox[0]

def pill(x, y, w, h, color, alpha=255):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    r, g, b = color
    od.rounded_rectangle([x, y, x+w, y+h], radius=h//2, fill=(r, g, b, alpha))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

def rounded_rect(x, y, w, h, color, alpha=255, radius=6, outline=None, outline_alpha=80):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    r, g, b = color
    od.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=(r, g, b, alpha))
    if outline:
        ro, go, bo = outline
        od.rounded_rectangle([x, y, x+w, y+h], radius=radius, outline=(ro, go, bo, outline_alpha), width=1)
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

# ─── BACKGROUND DOT GRID ──────────────────────────────────────────────────────
for gx in range(0, W, 32):
    for gy in range(0, H, 32):
        dot(gx, gy, 1, C["faint"], alpha=45)

# ─── LARGE BACKGROUND CROSSHAIR (decorative, center-canvas) ──────────────────
bg_cx, bg_cy = W // 2, H // 2
for r in [320, 480, 640, 800]:
    circle_outline(bg_cx, bg_cy, r, C["teal"], alpha=4, w=1)
line(0, bg_cy, W, bg_cy, C["teal"], alpha=6, w=1)
line(bg_cx, 0, bg_cx, H, C["teal"], alpha=6, w=1)
dot(bg_cx, bg_cy, 2, C["teal"], alpha=20)

# ─── HORIZONTAL RULE LINES ────────────────────────────────────────────────────
line(0, 72, W, 72, C["navy_border"], alpha=120, w=1)
line(0, H-48, W, H-48, C["navy_border"], alpha=80, w=1)

# ─── HEADER BAR ───────────────────────────────────────────────────────────────
rect(0, 0, W, 72, C["navy_mid"], 255)
line(0, 72, W, 72, C["navy_border"], alpha=160, w=1)

# Crosshair logo in header
logo_x, logo_y, logo_r = 52, 36, 18
circle_outline(logo_x, logo_y, logo_r, C["teal"], alpha=220, w=2)
circle_outline(logo_x, logo_y, logo_r//2, C["teal"], alpha=120, w=1)
dot(logo_x, logo_y, 2, C["teal"], alpha=255)
# crosshair lines
line(logo_x - logo_r - 6, logo_y, logo_x - logo_r//2, logo_y, C["teal"], alpha=200, w=1)
line(logo_x + logo_r//2, logo_y, logo_x + logo_r + 6, logo_y, C["teal"], alpha=200, w=1)
line(logo_x, logo_y - logo_r - 6, logo_x, logo_y - logo_r//2, C["teal"], alpha=200, w=1)
line(logo_x, logo_y + logo_r//2, logo_x, logo_y + logo_r + 6, C["teal"], alpha=200, w=1)

text_c("JURI", 82, 18, f_title, C["white"], alpha=255)
text_c("ALVO", 82 + text_width("JURI", f_title) + 3, 18, f_title, C["teal"], alpha=255)
text_c("™", 82 + text_width("JURIALVO", f_title) + 6, 18, f_body, C["muted"], alpha=200)
text_c("EMEE-Z  ·  GESTÃO DE WHATSAPP", 82, 42, f_mono_sm, C["muted"], alpha=180)

# Header right: coordinate / version tags
text_c("DESIGN SYSTEM  v1.0  ·  2026", W - 24, 28, f_mono_sm, C["faint"], alpha=160, anchor="rt")
text_c("MERIDIAN VOID  ·  BRAND IDENTITY", W - 24, 46, f_label, C["faint"], alpha=100, anchor="rt")

# Teal accent line under logo area
line(30, 72, 320, 72, C["teal"], alpha=80, w=2)


# ══════════════════════════════════════════════════════════════════════════════
# LAYOUT: Three equal panels side by side
# ══════════════════════════════════════════════════════════════════════════════
PAD   = 28
TOP   = 96
BOT   = H - 56
PH    = BOT - TOP   # panel height = 930
PW    = (W - PAD*4) // 3  # ~600 each
GAP   = PAD

P1x = PAD
P2x = PAD*2 + PW
P3x = PAD*3 + PW*2

# ── SECTION LABELS ────────────────────────────────────────────────────────────
for px, label, sub in [
    (P1x, "01  LOGIN", "AUTH GATEWAY"),
    (P2x, "02  INBOX", "AGENT INTERFACE"),
    (P3x, "03  DASHBOARD", "GESTORA VIEW"),
]:
    text_c(label, px, TOP - 20, f_label_bold, C["teal"], alpha=240)
    lw = text_width(label, f_label_bold)
    text_c(sub, px + lw + 14, TOP - 20, f_label, C["faint"], alpha=140)
    # Teal rule below label
    line(px, TOP - 5, px + PW, TOP - 5, C["navy_border"], alpha=60, w=1)
    line(px, TOP - 5, px + 48, TOP - 5, C["teal"], alpha=180, w=1)
    dot(px + 48, TOP - 5, 2, C["teal"], alpha=200)


# ══════════════════════════════════════════════════════════════════════════════
#  PANEL 1 — LOGIN
# ══════════════════════════════════════════════════════════════════════════════
px = P1x

# Panel background
rounded_rect(px, TOP, PW, PH, C["navy_mid"], alpha=255, radius=10, outline=C["navy_border"], outline_alpha=100)

# Subtle inner dot grid overlay (just in panel)
for gx in range(px+16, px+PW-16, 24):
    for gy in range(TOP+16, TOP+PH-16, 24):
        dot(gx, gy, 1, C["faint"], alpha=30)

# Large crosshair decorative element in background
cx, cy = px + PW//2, TOP + PH//2 - 60
for r, a in [(60, 20), (100, 14), (150, 10), (220, 7)]:
    circle_outline(cx, cy, r, C["teal"], alpha=a, w=1)
line(cx - 260, cy, cx - 65, cy, C["teal"], alpha=16, w=1)
line(cx + 65,  cy, cx + 260, cy, C["teal"], alpha=16, w=1)
line(cx, cy - 260, cx, cy - 65, C["teal"], alpha=16, w=1)
line(cx, cy + 65,  cx, cy + 260, C["teal"], alpha=16, w=1)
# Tick marks on crosshair arms
for dist in [80, 100, 120]:
    line(cx - dist, cy - 5, cx - dist, cy + 5, C["teal"], alpha=20, w=1)
    line(cx + dist, cy - 5, cx + dist, cy + 5, C["teal"], alpha=20, w=1)
    line(cx - 5, cy - dist, cx + 5, cy - dist, C["teal"], alpha=20, w=1)
    line(cx - 5, cy + dist, cx + 5, cy + dist, C["teal"], alpha=20, w=1)
dot(cx, cy, 4, C["teal"], alpha=40)
dot(cx, cy, 2, C["teal"], alpha=80)

# ── Login card ────────────────────────────────────────────────────────────────
card_w, card_h = 310, 430
cx_card = px + (PW - card_w)//2
cy_card = TOP + (PH - card_h)//2 - 20

# Subtle glow behind card
overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
for spread in range(30, 0, -4):
    alpha_g = int(8 * (30 - spread) / 30)
    od.rounded_rectangle(
        [cx_card - spread, cy_card - spread, cx_card + card_w + spread, cy_card + card_h + spread],
        radius=12 + spread, fill=(0, 198, 162, alpha_g))
canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

rounded_rect(cx_card, cy_card, card_w, card_h, C["navy_card"], alpha=255, radius=12, outline=C["navy_border"], outline_alpha=160)
# Top teal accent line on card
line(cx_card + 20, cy_card, cx_card + card_w - 20, cy_card, C["teal"], alpha=180, w=2)

# Logo in card
logo_cx = cx_card + card_w//2
logo_cy = cy_card + 58
lc_r = 22
circle_outline(logo_cx, logo_cy, lc_r, C["teal"], alpha=200, w=2)
circle_outline(logo_cx, logo_cy, lc_r//2, C["teal"], alpha=100, w=1)
dot(logo_cx, logo_cy, 3, C["teal"], alpha=255)
line(logo_cx - lc_r - 8, logo_cy, logo_cx - lc_r//2 - 2, logo_cy, C["teal"], alpha=180, w=1)
line(logo_cx + lc_r//2 + 2, logo_cy, logo_cx + lc_r + 8, logo_cy, C["teal"], alpha=180, w=1)
line(logo_cx, logo_cy - lc_r - 8, logo_cx, logo_cy - lc_r//2 - 2, C["teal"], alpha=180, w=1)
line(logo_cx, logo_cy + lc_r//2 + 2, logo_cx, logo_cy + lc_r + 8, C["teal"], alpha=180, w=1)

# Brand name centered
juri_w = text_width("JURI", f_title)
alvo_w = text_width("ALVO", f_title)
total_w = juri_w + alvo_w + 4
name_x = logo_cx - total_w//2
text_c("JURI", name_x, cy_card + 90, f_title, C["white"])
text_c("ALVO", name_x + juri_w + 4, cy_card + 90, f_title, C["teal"])
tagline = "GESTÃO DE WHATSAPP"
tw = text_width(tagline, f_label)
text_c(tagline, logo_cx - tw//2, cy_card + 118, f_label, C["muted"], alpha=160)

# Divider
line(cx_card + 32, cy_card + 136, cx_card + card_w - 32, cy_card + 136, C["navy_border"], alpha=150, w=1)

# Email field
fy = cy_card + 150
text_c("EMAIL", cx_card + 28, fy, f_label, C["muted"], alpha=180)
rounded_rect(cx_card + 24, fy + 14, card_w - 48, 36, C["navy_deep"], alpha=255, radius=6, outline=C["navy_border"], outline_alpha=180)
text_c("seu@jurialvo.com.br", cx_card + 38, fy + 24, f_body_sm, C["faint"], alpha=180)

# Password field
py2 = fy + 66
text_c("SENHA", cx_card + 28, py2, f_label, C["muted"], alpha=180)
rounded_rect(cx_card + 24, py2 + 14, card_w - 48, 36, C["navy_deep"], alpha=255, radius=6, outline=C["navy_border"], outline_alpha=180)
# dots for password
for di in range(8):
    dot(cx_card + 44 + di*16, py2 + 32, 3, C["faint"], alpha=200)

# Teal focus ring on email field (show active state)
overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
od.rounded_rectangle([cx_card + 24, fy + 14, cx_card + 24 + card_w - 48, fy + 14 + 36],
                     radius=6, outline=(0, 198, 162, 140), width=2)
canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

# Submit button
btn_y = py2 + 70
rounded_rect(cx_card + 24, btn_y, card_w - 48, 40, C["teal"], alpha=255, radius=8)
label_btn = "ENTRAR"
bw = text_width(label_btn, f_title_sm)
text_c(label_btn, cx_card + 24 + (card_w - 48 - bw)//2, btn_y + 12, f_title_sm, C["navy_deep"], alpha=255)

# Footer
foot_y = cy_card + card_h - 28
foot_txt = "ACESSO RESTRITO  ·  CONTATE A GESTORA"
fw = text_width(foot_txt, f_label)
text_c(foot_txt, logo_cx - fw//2, foot_y, f_label, C["faint"], alpha=120)

# Corner coordinate labels
text_c(f"[{cx_card},{cy_card}]", cx_card + 6, cy_card + 6, f_label, C["faint"], alpha=60)


# ══════════════════════════════════════════════════════════════════════════════
#  PANEL 2 — INBOX (AGENT)
# ══════════════════════════════════════════════════════════════════════════════
px = P2x

rounded_rect(px, TOP, PW, PH, C["navy_mid"], alpha=255, radius=10, outline=C["navy_border"], outline_alpha=100)

# Sub-panel widths
SIDEBAR_W = 200
CHAT_W = PW - SIDEBAR_W - 1

# ── Sidebar (conversation list) ───────────────────────────────────────────────
rounded_rect(px, TOP, SIDEBAR_W, PH, C["navy_mid"], alpha=255, radius=10)
line(px + SIDEBAR_W, TOP + 10, px + SIDEBAR_W, TOP + PH - 10, C["navy_border"], alpha=120, w=1)

# Sidebar header
rect(px, TOP, SIDEBAR_W, 44, C["navy_mid"])
text_c("CAIXA DE ENTRADA", px + 14, TOP + 10, f_label, C["teal"], alpha=200)
text_c("12 CONVERSAS", px + 14, TOP + 26, f_label, C["muted"], alpha=120)
line(px, TOP + 44, px + SIDEBAR_W, TOP + 44, C["navy_border"], alpha=100, w=1)

# Search bar
rounded_rect(px + 10, TOP + 52, SIDEBAR_W - 20, 28, C["navy_card"], alpha=255, radius=5, outline=C["navy_border"], outline_alpha=120)
text_c("BUSCAR...", px + 22, TOP + 61, f_label, C["faint"], alpha=130)

# Conversations
convs = [
    ("Ana Lima",       "Preciso de ajuda com...",  "09:42", "teal",  "3", "ATIVO"),
    ("Carlos M.",      "Ok, aguardando retorno",    "09:38", "faint", "",  "AGUARDANDO"),
    ("Fernanda C.",    "Qual o prazo para...",      "09:21", "faint", "",  "ATIVO"),
    ("Roberto S.",     "Documento recebido",        "08:55", "faint", "1", "ATIVO"),
    ("Julia V.",       "Obrigada pela atenção",     "08:30", "faint", "",  "ENCERRADO"),
    ("Marcos P.",      "Quando posso esperar...",   "08:10", "faint", "",  "AGUARDANDO"),
    ("Sofia R.",       "Preciso urgente!",          "07:58", "amber", "5", "ATIVO"),
    ("Eduardo T.",     "Ligação perdida",           "07:30", "faint", "",  "ENCERRADO"),
]

# Active conversation highlight
active_idx = 0
conv_y0 = TOP + 88

for i, (name, preview, time_, color_key, badge, status) in enumerate(convs):
    cy_c = conv_y0 + i * 68
    if cy_c + 68 > TOP + PH - 10:
        break

    # Active highlight
    if i == active_idx:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rectangle([px + 1, cy_c, px + SIDEBAR_W - 1, cy_c + 66], fill=(0, 198, 162, 18))
        canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))
        line(px + 1, cy_c, px + 1, cy_c + 66, C["teal"], alpha=255, w=3)

    # Avatar circle
    av_c = C["teal"] if i == active_idx else C["navy_border"]
    circle_outline(px + 24, cy_c + 33, 16, av_c, alpha=200, w=1)
    initial = name[0]
    iw = text_width(initial, f_title_sm)
    text_c(initial, px + 24 - iw//2, cy_c + 25, f_title_sm, C["muted"] if i != active_idx else C["teal"], alpha=200)

    # Name + time
    text_c(name, px + 48, cy_c + 14, f_title_sm, C["white"] if i == active_idx else C["muted"], alpha=230)
    text_c(time_, px + SIDEBAR_W - 12, cy_c + 14, f_label, C["faint"], alpha=140, anchor="rt")

    # Preview text
    preview_clip = preview[:26] + "…" if len(preview) > 26 else preview
    text_c(preview_clip, px + 48, cy_c + 34, f_label, C["muted"] if i == active_idx else C["faint"], alpha=160)

    # Status badge
    if status == "AGUARDANDO":
        pill(px + 48, cy_c + 50, 58, 12, C["amber"], alpha=40)
        text_c(status, px + 77 - text_width(status, f_label)//2, cy_c + 51, f_label, C["amber"], alpha=200)
    elif status == "ENCERRADO":
        pill(px + 48, cy_c + 50, 58, 12, C["red"], alpha=30)
        text_c(status, px + 77 - text_width(status, f_label)//2, cy_c + 51, f_label, C["red"], alpha=180)
    else:
        pill(px + 48, cy_c + 50, 36, 12, C["teal"], alpha=30)
        text_c("ATIVO", px + 66 - text_width("ATIVO", f_label)//2, cy_c + 51, f_label, C["teal"], alpha=180)

    # Badge count
    if badge:
        dot(px + SIDEBAR_W - 18, cy_c + 40, 9, C["teal"], alpha=255)
        bw2 = text_width(badge, f_label)
        text_c(badge, px + SIDEBAR_W - 18 - bw2//2, cy_c + 32, f_label, C["navy_deep"], alpha=255)

    line(px + 14, cy_c + 66, px + SIDEBAR_W - 14, cy_c + 66, C["navy_border"], alpha=60, w=1)

# ── Chat panel ────────────────────────────────────────────────────────────────
chat_x = px + SIDEBAR_W + 1

# Chat header
rect(chat_x, TOP, CHAT_W, 56, C["navy_card"])
line(chat_x, TOP + 56, chat_x + CHAT_W, TOP + 56, C["navy_border"], alpha=120, w=1)
circle_outline(chat_x + 26, TOP + 28, 14, C["teal"], alpha=180, w=1)
text_c("A", chat_x + 22, TOP + 20, f_title_sm, C["teal"], alpha=200)
text_c("Ana Lima", chat_x + 48, TOP + 12, f_title_sm, C["white"], alpha=240)
text_c("+55 11 99876-5432  ·  CPF: 123.456.789-00", chat_x + 48, TOP + 32, f_mono_sm, C["muted"], alpha=150)
# Status dot
dot(chat_x + CHAT_W - 20, TOP + 28, 5, C["teal"], alpha=220)
text_c("ONLINE", chat_x + CHAT_W - 34, TOP + 22, f_label, C["teal"], alpha=180, anchor="rt")

# Chat area background
rect(chat_x, TOP + 56, CHAT_W, PH - 56 - 56, C["navy_deep"])

# Messages
msgs = [
    ("recv", "Bom dia! Preciso de ajuda com o processo de recuperação do meu ativo.", "09:40"),
    ("sent", "Bom dia, Ana! Claro, estou aqui para ajudar. Pode me passar o número do processo?", "09:41"),
    ("recv", "Processo nº 0001234-56.2025.8.26.0001", "09:41"),
    ("sent", "Perfeito. Localizei seu processo no sistema. Aguarde um momento.", "09:42"),
    ("recv", "Ok, obrigada! Fico no aguardo.", "09:42"),
]

msg_area_y = TOP + 66
for mi, (mtype, text, mtime) in enumerate(msgs):
    # Word-wrap simulation (split at 36 chars)
    words = text.split()
    lines_txt, cur = [], ""
    for w in words:
        if len(cur) + len(w) + 1 > 36:
            lines_txt.append(cur.strip())
            cur = w
        else:
            cur += (" " if cur else "") + w
    if cur:
        lines_txt.append(cur.strip())

    bubble_h = len(lines_txt) * 18 + 20
    bubble_w = min(max(len(lines_txt[0]) * 7 + 24, 120), CHAT_W - 60)

    if mtype == "sent":
        bx = chat_x + CHAT_W - bubble_w - 16
        rounded_rect(bx, msg_area_y, bubble_w, bubble_h, C["teal_dim"], alpha=200, radius=8)
        for li, lt in enumerate(lines_txt):
            text_c(lt, bx + 12, msg_area_y + 10 + li*18, f_body_sm, C["white"], alpha=240)
        text_c(mtime, bx + bubble_w - 8, msg_area_y + bubble_h - 14, f_label, C["navy_deep"], alpha=160, anchor="rt")
    else:
        bx = chat_x + 16
        rounded_rect(bx, msg_area_y, bubble_w, bubble_h, C["navy_card"], alpha=255, radius=8, outline=C["navy_border"], outline_alpha=120)
        for li, lt in enumerate(lines_txt):
            text_c(lt, bx + 12, msg_area_y + 10 + li*18, f_body_sm, C["white"], alpha=220)
        text_c(mtime, bx + bubble_w - 8, msg_area_y + bubble_h - 14, f_label, C["muted"], alpha=130, anchor="rt")

    msg_area_y += bubble_h + 10

# Message input bar
input_y = TOP + PH - 52
rect(chat_x, input_y, CHAT_W, 52, C["navy_card"])
line(chat_x, input_y, chat_x + CHAT_W, input_y, C["navy_border"], alpha=120, w=1)
rounded_rect(chat_x + 14, input_y + 10, CHAT_W - 72, 32, C["navy_deep"], alpha=255, radius=6, outline=C["navy_border"], outline_alpha=150)
text_c("Digite uma mensagem...", chat_x + 28, input_y + 20, f_body_sm, C["faint"], alpha=150)
# Send button
send_x = chat_x + CHAT_W - 50
rounded_rect(send_x, input_y + 10, 36, 32, C["teal"], alpha=255, radius=6)
# Arrow icon
text_c("→", send_x + 10, input_y + 16, f_title_sm, C["navy_deep"])


# ══════════════════════════════════════════════════════════════════════════════
#  PANEL 3 — DASHBOARD (GESTORA)
# ══════════════════════════════════════════════════════════════════════════════
px = P3x

rounded_rect(px, TOP, PW, PH, C["navy_mid"], alpha=255, radius=10, outline=C["navy_border"], outline_alpha=100)

# Dashboard header
rect(px, TOP, PW, 44, C["navy_mid"])
text_c("DASHBOARD  ·  VISÃO GERAL", px + 16, TOP + 10, f_label, C["teal"], alpha=200)
text_c("14 ABR 2026  ·  09:43:12", px + PW - 16, TOP + 10, f_mono_sm, C["muted"], alpha=160, anchor="rt")
dot(px + PW - 100, TOP + 27, 4, C["teal"], alpha=200)
text_c("SISTEMA ATIVO", px + PW - 106, TOP + 22, f_label, C["teal"], alpha=180, anchor="rt")
line(px, TOP + 44, px + PW, TOP + 44, C["navy_border"], alpha=100, w=1)

# ── Metric cards ──────────────────────────────────────────────────────────────
metrics = [
    ("TOTAL CONVERSAS",   "1.284",  "+12%",  True,  "HOJE"),
    ("AGENTES ATIVOS",    "8",      "/ 10",  True,  "ONLINE"),
    ("T. MÉD. RESPOSTA",  "02:34",  "-18%",  True,  "MIN"),
    ("TAXA RESOLUÇÃO",    "94.2",   "+3.1%", True,  "%"),
]

mc_w = (PW - 32 - 12*3) // 4  # 4 cards across with 12px gaps
mc_h = 88
mc_y = TOP + 56

bar_fills = [0.78, 0.80, 0.68, 0.94]
for mi, (label, value, delta, positive, unit) in enumerate(metrics):
    mc_x = px + 16 + mi * (mc_w + 12)
    rounded_rect(mc_x, mc_y, mc_w, mc_h, C["navy_card"], alpha=255, radius=8, outline=C["navy_border"], outline_alpha=100)
    delta_color = C["teal"] if positive else C["red"]
    # Top accent micro-line
    line(mc_x + 12, mc_y + 1, mc_x + 32, mc_y + 1, delta_color, alpha=160, w=1)
    text_c(label, mc_x + 12, mc_y + 10, f_label, C["muted"], alpha=170)
    # Value — use smaller mono for longer values
    val_fnt = f_mono_lg if len(value) <= 5 else f_mono_bold
    text_c(value, mc_x + 12, mc_y + 28, val_fnt, C["white"], alpha=240)
    text_c(unit, mc_x + mc_w - 10, mc_y + 12, f_label, C["faint"], alpha=110, anchor="rt")
    # Delta
    text_c(delta, mc_x + 12, mc_y + 68, f_mono_sm, delta_color, alpha=220)
    # Progress bar
    bar_fill_w = int((mc_w - 24) * bar_fills[mi])
    rect(mc_x + 12, mc_y + mc_h - 5, mc_w - 24, 3, C["navy_border"])
    rect(mc_x + 12, mc_y + mc_h - 5, bar_fill_w, 3, delta_color)

# ── Activity chart ────────────────────────────────────────────────────────────
chart_y = mc_y + mc_h + 16
chart_h = 200
chart_x = px + 16
chart_w = PW - 32

rounded_rect(chart_x, chart_y, chart_w, chart_h, C["navy_card"], alpha=255, radius=8, outline=C["navy_border"], outline_alpha=100)
text_c("ATIVIDADE  ·  ÚLTIMAS 12 HORAS", chart_x + 14, chart_y + 12, f_label, C["teal"], alpha=200)

# Grid lines in chart
for gi in range(1, 5):
    gy_g = chart_y + 30 + gi * (chart_h - 50) // 5
    line(chart_x + 14, gy_g, chart_x + chart_w - 14, gy_g, C["navy_border"], alpha=80, w=1)

# Chart data (hourly)
data = [18, 24, 31, 45, 62, 79, 88, 95, 82, 70, 64, 78]
hours = ["22h","23h","00h","01h","02h","03h","04h","05h","06h","07h","08h","09h"]
ch_plot_y = chart_y + 30
ch_plot_h = chart_h - 55
ch_plot_x = chart_x + 30
ch_plot_w = chart_w - 44

max_val = max(data)
pts = []
for i, v in enumerate(data):
    x_ = ch_plot_x + i * ch_plot_w // (len(data) - 1)
    y_ = ch_plot_y + ch_plot_h - int(v / max_val * ch_plot_h)
    pts.append((x_, y_))

# Area fill under line
if len(pts) >= 2:
    poly_pts = [pts[0]] + pts + [(pts[-1][0], ch_plot_y + ch_plot_h), (pts[0][0], ch_plot_y + ch_plot_h)]
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.polygon(poly_pts, fill=(0, 198, 162, 22))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

# Line
for i in range(len(pts) - 1):
    line(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], C["teal"], alpha=200, w=2)

# Dots at each data point
for pt in pts:
    dot(pt[0], pt[1], 3, C["teal"], alpha=255)
    dot(pt[0], pt[1], 1, C["navy_deep"], alpha=255)

# Hour labels
for i, h in enumerate(hours):
    lx_ = ch_plot_x + i * ch_plot_w // (len(data) - 1)
    text_c(h, lx_, ch_plot_y + ch_plot_h + 6, f_label, C["faint"], alpha=120, anchor="mt")

# Current value callout
last_pt = pts[-1]
rounded_rect(last_pt[0] - 20, last_pt[1] - 28, 42, 20, C["teal"], alpha=240, radius=4)
text_c("78", last_pt[0] + 1, last_pt[1] - 24, f_mono_sm, C["navy_deep"], alpha=255, anchor="mt")

# ── Agent status table ────────────────────────────────────────────────────────
tbl_y = chart_y + chart_h + 16
tbl_h = PH - (tbl_y - TOP) - 16
tbl_x = chart_x
tbl_w = chart_w

rounded_rect(tbl_x, tbl_y, tbl_w, tbl_h, C["navy_card"], alpha=255, radius=8, outline=C["navy_border"], outline_alpha=100)
text_c("AGENTES  ·  STATUS EM TEMPO REAL", tbl_x + 14, tbl_y + 12, f_label, C["teal"], alpha=200)
line(tbl_x + 14, tbl_y + 30, tbl_x + tbl_w - 14, tbl_y + 30, C["navy_border"], alpha=80, w=1)

agents_data = [
    ("Maria S.",   "ONLINE",     "3 conv.",  "01:42", "teal"),
    ("João P.",    "ONLINE",     "5 conv.",  "03:21", "teal"),
    ("Clara R.",   "PAUSA",      "0 conv.",  "—",     "amber"),
    ("Thiago M.",  "ONLINE",     "2 conv.",  "00:58", "teal"),
    ("Bruna L.",   "OFFLINE",    "0 conv.",  "—",     "faint"),
]

col_w = tbl_w // 4
row_h = (tbl_h - 36) // len(agents_data)

for ai, (aname, astatus, aconv, atime, acolor_key) in enumerate(agents_data):
    ry = tbl_y + 34 + ai * row_h
    if ai % 2 == 0:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rectangle([tbl_x + 1, ry, tbl_x + tbl_w - 1, ry + row_h],
                     fill=(30, 42, 66, 30))
        canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"))

    acolor = C[acolor_key]
    dot(tbl_x + 20, ry + row_h//2, 4, acolor, alpha=220)
    text_c(aname, tbl_x + 34, ry + row_h//2 - 7, f_body_sm, C["white"], alpha=220)
    # Status pill
    pill_w = text_width(astatus, f_label) + 16
    pill(tbl_x + col_w, ry + row_h//2 - 8, pill_w, 16, acolor, alpha=30)
    text_c(astatus, tbl_x + col_w + pill_w//2 - text_width(astatus, f_label)//2,
           ry + row_h//2 - 6, f_label, acolor, alpha=220)
    text_c(aconv,  tbl_x + col_w*2 + 8, ry + row_h//2 - 7, f_mono_sm, C["muted"], alpha=180)
    text_c(atime,  tbl_x + col_w*3 + 8, ry + row_h//2 - 7, f_mono_sm, C["muted"], alpha=160)

    line(tbl_x + 14, ry + row_h - 1, tbl_x + tbl_w - 14, ry + row_h - 1, C["navy_border"], alpha=40, w=1)

# Column headers
text_c("AGENTE",    tbl_x + 34,         tbl_y + 18, f_label, C["faint"], alpha=140)
text_c("STATUS",    tbl_x + col_w,      tbl_y + 18, f_label, C["faint"], alpha=140)
text_c("CONVERSAS", tbl_x + col_w*2 + 8,tbl_y + 18, f_label, C["faint"], alpha=140)
text_c("T. MÉD.",   tbl_x + col_w*3 + 8,tbl_y + 18, f_label, C["faint"], alpha=140)


# ══════════════════════════════════════════════════════════════════════════════
#  FOOTER
# ══════════════════════════════════════════════════════════════════════════════
foot_y = H - 44
foot_txt = "JURIALVO™  ·  EMEE-Z DESIGN SYSTEM  ·  MERIDIAN VOID v1.0  ·  CONFIDENCIAL"
fw = text_width(foot_txt, f_label)
text_c(foot_txt, W//2 - fw//2, foot_y + 14, f_label, C["faint"], alpha=120)

# Footer decorative crosshair
for fx_, a_ in [(W//2 - fw//2 - 24, 80), (W//2 + fw//2 + 24, 80)]:
    circle_outline(fx_, foot_y + 22, 6, C["teal"], alpha=a_, w=1)
    dot(fx_, foot_y + 22, 1, C["teal"], alpha=a_)

# ── Thin teal top accent line ─────────────────────────────────────────────────
line(0, 0, W, 0, C["teal"], alpha=200, w=2)
line(0, 2, W, 2, C["teal_dim"], alpha=50, w=1)

# ── Corner markers (precision / targeting aesthetic) ──────────────────────────
corner_sz = 16
corner_alpha = 90
for cx2, cy2 in [(8, 8), (W - 8, 8), (8, H - 8), (W - 8, H - 8)]:
    sign_x = 1 if cx2 < W//2 else -1
    sign_y = 1 if cy2 < H//2 else -1
    line(cx2, cy2, cx2 + sign_x * corner_sz, cy2, C["teal"], alpha=corner_alpha, w=1)
    line(cx2, cy2, cx2, cy2 + sign_y * corner_sz, C["teal"], alpha=corner_alpha, w=1)
    dot(cx2, cy2, 1, C["teal"], alpha=corner_alpha)

# ─── SAVE ─────────────────────────────────────────────────────────────────────
canvas.save(OUTPUT, "PNG", optimize=True)
print(f"✓ Saved: {OUTPUT}")
print(f"  Size: {W}×{H}px")
