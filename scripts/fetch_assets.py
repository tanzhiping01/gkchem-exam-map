#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""下载「原卷」图片到本地，使站点完全离线可用。

用法：
    python scripts/fetch_assets.py                 # 下载全部缺失图片
    python scripts/fetch_assets.py --limit 20      # 只下 20 张，先试水
    python scripts/fetch_assets.py --base URL      # 指定图片源站

下载完成后，把 config.js 里的 window.ASSET_BASE 改成 ""，即可只读本地图片。
"""

import argparse
import concurrent.futures as futures
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QMAP = os.path.join(ROOT, "assets", "qmap", "qmap.js")
DEFAULT_BASE = "https://4m2mk8cmzus5x.doubao.link/app/app_17haxc9sspu/"
PATTERN = re.compile(r'"(assets/y2426/[^"]+\.(?:webp|jpg|jpeg|png))"')


def collect_paths():
    with open(QMAP, encoding="utf-8") as fh:
        text = fh.read()
    return sorted(set(PATTERN.findall(text)))


def download(base, rel, retries=3):
    dest = os.path.join(ROOT, rel.replace("/", os.sep))
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return "skip", rel
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    url = base.rstrip("/") + "/" + urllib.parse.quote(rel)
    last = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
            if not data:
                raise IOError("empty body")
            tmp = dest + ".part"
            with open(tmp, "wb") as fh:
                fh.write(data)
            os.replace(tmp, dest)
            return "ok", rel
        except Exception as exc:  # noqa: BLE001
            last = exc
    return "fail", "%s (%s)" % (rel, last)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()

    paths = collect_paths()
    if args.limit:
        paths = paths[: args.limit]
    if not paths:
        sys.exit("未在 qmap.js 中找到图片路径")

    ok = skip = fail = 0
    failures = []
    with futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        jobs = [pool.submit(download, args.base, p) for p in paths]
        for i, job in enumerate(futures.as_completed(jobs), 1):
            state, info = job.result()
            if state == "ok":
                ok += 1
            elif state == "skip":
                skip += 1
            else:
                fail += 1
                failures.append(info)
            if i % 50 == 0 or i == len(jobs):
                print("\r进度 %d/%d  新增 %d  跳过 %d  失败 %d" % (i, len(jobs), ok, skip, fail), end="")
    print()
    if failures:
        print("失败清单（前 20 条）：")
        for item in failures[:20]:
            print("  -", item)
        print("重新运行本脚本会自动续传。")


if __name__ == "__main__":
    main()
