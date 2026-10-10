#!/usr/bin/env python3
"""Dựng index.html = khung giao diện Design System (design/prototype-v0.2.1.html) + src/body.html + src/app.js.
Chạy: python3 tools/build_app.py   (phiên bản lấy từ package.json)"""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
ver = json.loads((R/"package.json").read_text(encoding="utf-8"))["version"]
proto = (R/"design/prototype-v0.2.1.html").read_text(encoding="utf-8")
head = proto[:proto.index("</style>")]
head = head.replace("<title>BG Sales Management — Design System Foundation v0.2.1</title>", "<title>BG Sales Management</title>")
page = head + (R/"src/extra.css").read_text(encoding="utf-8") + "</style>\n</head>\n<body>\n" + (R/"src/body.html").read_text(encoding="utf-8") + "<script>\n" + (R/"src/app.js").read_text(encoding="utf-8") + "</script>\n</body>\n</html>\n"
(R/"index.html").write_text(page.replace("{{VER}}", ver), encoding="utf-8")
print("Đã dựng index.html, phiên bản", ver, f"({len(page)//1024} KB)")
