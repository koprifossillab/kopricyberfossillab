"""kopricyberfossillab 아이콘 — 등각 미니어처 연구실 한 칸(바닥·벽 둘) 안에 책상 앞에 앉은 사람,
왼쪽 벽에 빛나는 삼엽충 화석, 오른쪽 벽에 회로선. 화면(2.5D 연구실)과 이름(Cyber Fossil)을 한 그림에.

    ~/venv/kopricyberfossillab/bin/python tools/icon/build.py          # → web/public/icons/
    ~/venv/kopricyberfossillab/bin/python tools/icon/build.py --check  # + 작은 크기 점검 시트 (저장소 밖 /tmp)

kopri-devdocs/guides/logo-animation 의 순서와 logokit.icon_set() 을 따른다. kopri-devdocs 는 이 저장소의 형제(../kopri-devdocs)로 둔다.
requirements 는 그 README 대로 — venv 는 ~/venv/kopricyberfossillab (저장소 안에 두지 않는다).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
KIT = os.path.normpath(os.path.join(ROOT, "..", "kopri-devdocs", "guides", "logo-animation"))
sys.path.insert(0, KIT)

from logokit import icon_set, render_png  # noqa: E402

OUT = os.path.join(ROOT, "web", "public", "icons")
NAME = "kopricyberfossillab"

# 화면의 남색 바탕(#0f172a)과 같은 계열의 명암 단계 + 포인트 하나(#38bdf8)
P = dict(bg="#0f172a", wallL="#1e293b", wallR="#273449", floor="#334155", line="#475569",
         desk="#64748b", deskTop="#94a3b8", body="#e2e8f0", head="#cbd5e1", acc="#38bdf8", accDim="#0e7490")

# 등각 투영 — (x, y, z): x 는 오른쪽 아래, z 는 왼쪽 아래, y 는 위. 방은 x·z 0~1, 벽 높이 H
K, O, H = 252, (256, 186), 0.56
C30 = 0.8660254


def pt(x, y, z):
    return (O[0] + (x - z) * C30 * K, O[1] + (x + z) * 0.5 * K - y * K)


def poly(pts, fill, extra=""):
    d = " ".join(f"{a:.1f},{b:.1f}" for a, b in pts)
    return f'<polygon points="{d}" fill="{fill}" {extra}/>'


def block(x0, z0, x1, z1, y0, y1, top, left, right):
    """상자 — 보이는 면 셋(위, 앞-왼쪽 z=z1, 앞-오른쪽 x=x1)"""
    return (poly([pt(x0, y1, z1), pt(x1, y1, z1), pt(x1, y0, z1), pt(x0, y0, z1)], left)
            + poly([pt(x1, y1, z0), pt(x1, y1, z1), pt(x1, y0, z1), pt(x1, y0, z0)], right)
            + poly([pt(x0, y1, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y1, z1)], top))


def wall_matrix(axis):
    """벽 평면 좌표(u: 벽을 따라 0~1, v: 높이 0~H)를 화면으로 — SVG matrix(a b c d e f)"""
    o = pt(0, 0, 0)
    u = pt(0, 0, 1) if axis == "L" else pt(1, 0, 0)
    v = pt(0, 1, 0)
    return f"matrix({u[0]-o[0]:.3f} {u[1]-o[1]:.3f} {v[0]-o[0]:.3f} {v[1]-o[1]:.3f} {o[0]:.1f} {o[1]:.1f})"


def trilobite(cu, cv, s, color, ink):
    """벽 위의 삼엽충 — 벽 좌표(u·v)에 그린다. v 는 위가 +라서 그림을 뒤집어 놓는다(scale(s,-s)).
    채운 모양(두부·흉부 마디 다섯·미부)에 벽 색으로 축엽 선 — 작은 크기에서도 덩어리로 보이게"""
    b = (f'<path d="M -0.62 -0.3 Q -0.66 -1.02 0 -1.02 Q 0.66 -1.02 0.62 -0.3 Z" fill="{color}"/>'
         f'<path d="M -0.6 -0.36 Q -0.78 0.0 -0.7 0.3 Q -0.58 0.0 -0.45 -0.3 Z M 0.6 -0.36 Q 0.78 0.0 0.7 0.3 Q 0.58 0.0 0.45 -0.3 Z" fill="{color}"/>')
    for i in range(5):
        y, w = -0.22 + i * 0.17, 0.52 - i * 0.055
        b += f'<rect x="{-w:.3f}" y="{y:.3f}" width="{2*w:.3f}" height="0.12" rx="0.05" fill="{color}"/>'
    b += f'<path d="M -0.3 0.66 Q 0 1.05 0.3 0.66 Z" fill="{color}"/>'
    b += (f'<path d="M -0.17 -0.86 L -0.15 0.75 M 0.17 -0.86 L 0.15 0.75" stroke="{ink}" stroke-width="0.06" fill="none"/>'
          f'<circle cx="-0.34" cy="-0.62" r="0.07" fill="{ink}"/><circle cx="0.34" cy="-0.62" r="0.07" fill="{ink}"/>')
    return f'<g transform="translate({cu} {cv}) scale({s} {-s})">{b}</g>'


def circuit(color, dim):
    """오른쪽 벽의 회로선 — 꺾인 선 셋과 끝의 점(벽 좌표)"""
    lines = [((0.12, 0.4), (0.38, 0.4), (0.5, 0.3), (0.86, 0.3)),
             ((0.12, 0.24), (0.32, 0.24), (0.44, 0.14), (0.74, 0.14))]
    out = ""
    for i, ln in enumerate(lines):
        d = "M " + " L ".join(f"{u} {v}" for u, v in ln)
        out += f'<path d="{d}" fill="none" stroke="{color if i < 2 else dim}" stroke-width="0.04" stroke-linecap="round" stroke-linejoin="round"/>'
        for (u, v) in (ln[0], ln[-1]):
            out += f'<circle cx="{u}" cy="{v}" r="0.05" fill="{color if i < 2 else dim}"/>'
    return out


def person(x, z):
    """책상 앞에 앉은 사람 — 등을 보이는 둥근 몸과 머리(화면의 로우폴리 사람처럼 단순하게)"""
    bx, by = pt(x, 0.13, z)
    hx, hy = pt(x, 0.27, z)
    return (f'<rect x="{bx-21:.1f}" y="{by-28:.1f}" width="42" height="54" rx="17" fill="{P["body"]}"/>'
            f'<circle cx="{hx:.1f}" cy="{hy-4:.1f}" r="19" fill="{P["head"]}"/>')


def scene():
    b = []
    # 바닥과 벽 둘
    b.append(poly([pt(0, 0, 0), pt(1, 0, 0), pt(1, 0, 1), pt(0, 0, 1)], P["floor"]))
    b.append(poly([pt(0, 0, 0), pt(0, H, 0), pt(0, H, 1), pt(0, 0, 1)], P["wallL"]))
    b.append(poly([pt(0, 0, 0), pt(0, H, 0), pt(1, H, 0), pt(1, 0, 0)], P["wallR"]))
    # 벽 윗단 — 밝은 테(화면의 칸막이 테처럼)
    b.append(f'<path d="M {pt(0,H,1)[0]:.1f} {pt(0,H,1)[1]:.1f} L {pt(0,H,0)[0]:.1f} {pt(0,H,0)[1]:.1f} L {pt(1,H,0)[0]:.1f} {pt(1,H,0)[1]:.1f}" '
             f'fill="none" stroke="{P["line"]}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>')
    # 왼쪽 벽: 삼엽충 화석 (빛나는 선) · 오른쪽 벽: 회로선
    b.append(f'<g transform="{wall_matrix("L")}">{trilobite(0.48, 0.3, 0.205, P["acc"], P["wallL"])}</g>')
    b.append(f'<g transform="{wall_matrix("R")}">{circuit(P["acc"], P["accDim"])}</g>')
    # 책상과 모니터 — 모니터는 앞(+z)을 보고, 화면이 포인트 색
    b.append(block(0.34, 0.36, 0.84, 0.6, 0.0, 0.19, P["deskTop"], P["desk"], P["line"]))
    b.append(block(0.44, 0.4, 0.74, 0.45, 0.19, 0.4, P["line"], P["accDim"], P["line"]))
    b.append(poly([pt(0.465, 0.385, 0.45), pt(0.715, 0.385, 0.45), pt(0.715, 0.215, 0.45), pt(0.465, 0.215, 0.45)], P["acc"]))
    b.append(person(0.6, 0.8))
    return "".join(b)


def icon_svg(square=False):
    rx = 0 if square else 112
    return (f'<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">'
            f'<defs><clipPath id="r"><rect width="512" height="512" rx="{rx}"/></clipPath></defs>'
            f'<g clip-path="url(#r)"><rect width="512" height="512" fill="{P["bg"]}"/>{scene()}</g></svg>')


def check_sheet(path):
    """작은 크기 점검 — 512·64·32·16 을 나란히, 작은 것은 4배로 키워(픽셀이 보이게)"""
    from PIL import Image
    import io
    import cairosvg
    svg = icon_svg()
    sheet = Image.new("RGB", (512 + 3 * 160 + 80, 560), "#f1efe8")
    big512 = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=512)))
    sheet.paste(big512, (20, 24), big512)
    x = 552
    for s in (64, 32, 16):
        im = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=s, output_height=s)))
        big = im.resize((s * (128 // s) if s < 128 else s,) * 2, Image.NEAREST) if s < 64 else im
        sheet.paste(im, (x, 24), im)
        sheet.paste(big.resize((128, 128), Image.NEAREST), (x, 140), big.resize((128, 128), Image.NEAREST))
        x += 160
    sheet.save(path)


if __name__ == "__main__":
    made = icon_set(icon_svg(), OUT, NAME, svg_square=icon_svg(square=True), pwa=True)
    with open(os.path.join(OUT, f"{NAME}-icon-square.svg"), "w") as f:
        f.write(icon_svg(square=True))
    # paleolab 첫 화면 카드(1.4rem ≈ 22px, 고해상도 화면에서 44px)에 맞춘 것
    render_png(icon_svg(), os.path.join(OUT, "icon-48.png"), 48)
    render_png(icon_svg(), os.path.join(OUT, "icon-96.png"), 96)
    made += [f"{NAME}-icon-square.svg", "icon-48.png", "icon-96.png"]
    print("web/public/icons/ —", " ".join(made))
    if "--check" in sys.argv:
        p = os.path.join(os.environ.get("TMPDIR", "/tmp"), "fl-icon-check.png")
        check_sheet(p)
        print("점검 시트:", p)
