#!/usr/bin/env python3
"""Reviewed-source importer. Python/openpyxl and pdftotext are maintainer tools,
not application dependencies. A changed source checksum requires review.
Usage: python3 scripts/import_topics.py [--cache /tmp/politik-topic-sources]
"""
import argparse, csv, hashlib, io, json, re, subprocess, urllib.request, zipfile
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def number(value):
    if value is None or str(value).strip() in ('', '-', '–', '.'): return None
    value = float(str(value).replace(',', '.'))
    if not 0 <= value <= 100: raise ValueError('Invalid percentage')
    return value

def pdf_rows(text, kind):
    question = '¿Cuál es, a su juicio, el principal problema' if kind == 'cis' else '1. En la seva opinió, quins creu'
    block = text.split(question, 1)[1]
    block = block.split('Pregunta ', 1)[0] if kind == 'cis' else block.split('2. Quin', 1)[0]
    result, pending = {}, ''
    for line in block.splitlines():
        match = re.match(r'^\s*(.*?)\s{2,}(\d+[.,]\d|-)\s+(\d+[.,]\d|-)\s+(\d+[.,]\d|-)\s+(\d+[.,]\d|-)\s*$', line) if kind == 'cis' else re.match(r'^\s*(.*?)\s{2,}\d+\s+(\d+[.,]\d)\s*$', line)
        if match:
            label = match[1].strip(); value = number(match[5] if kind == 'cis' else match[2])
            if label.startswith(('Base:', 'Total', '(N)', 'Frecuencia')): continue
            result[label] = value; pending = label
        elif pending and line.startswith('   ') and line.strip() and not re.search(r'\d|TOTAL|problema|Pág|Estudio|Primer|Segundo|Tercer|Porcent', line):
            # Wrapped source labels must not create distinct false categories.
            value = result.pop(pending); pending += ' ' + line.strip(); result[pending] = value
    if len(result) < 15: raise ValueError(f'Unrecognized {kind} topic table')
    return result

def run(cache):
    manifest = json.loads((ROOT / 'src/content/topic-sources.json').read_text())
    series = {item['id']: {**item, 'observations': []} for item in manifest['series']}
    fgw = {}
    cache.mkdir(parents=True, exist_ok=True)
    for source in manifest['sources']:
        path = cache / source['file']
        if not path.exists():
            with urllib.request.urlopen(source['url'], timeout=60) as response: path.write_bytes(response.read())
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != source['sha256']: raise ValueError(f"Source changed: review {source['url']} and update manifest checksum")
        if source['kind'] == 'fgw':
            import openpyxl
            sheet = openpyxl.load_workbook(io.BytesIO(raw), data_only=True).worksheets[0]
            rows = list(sheet.values); labels = rows[7]
            if 'Wichtige Probleme' not in str(rows[4][1]): raise ValueError('FGW sheet changed')
            for row in rows[9:]:
                if not isinstance(row[1], datetime) or row[1].year < 2019: continue
                day = row[1].date().isoformat(); values = fgw.setdefault(day, {})
                for label, value in zip(labels[2:], row[2:]):
                    if label:
                        if label in values: raise ValueError('Duplicate FGW topic')
                        values[label] = number(value)
        elif source['kind'] in ('cis', 'ceo'):
            proc = subprocess.run(['pdftotext', '-q', '-layout', '-f', '1', '-l', '14', str(path), '-'], check=True, capture_output=True)
            values = pdf_rows(proc.stdout.decode('utf8'), source['kind'])
            series[source['series']]['observations'].append({k: source[k] for k in ('id', 'date', 'fieldwork', 'url')} | {'values': values})
        else:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                files = [name for name in archive.namelist() if name.lower().endswith('.csv')]
                if len(files) != 1: raise ValueError('Unexpected Barcelona ZIP')
                rows = list(csv.DictReader(io.StringIO(archive.read(files[0]).decode('utf-8-sig'))))
            weights, total = {}, 0
            for row in rows:
                label = row['PROB_BCN'].strip(); weight = float(row['PES'].replace(',', '.'))
                if not label or weight <= 0: raise ValueError('Barcelona topics changed')
                total += weight; weights[label] = weights.get(label, 0) + weight
            values = {label: round(weight / total * 100, 1) for label, weight in weights.items()}
            series[source['series']]['observations'].append({k: source[k] for k in ('id', 'date', 'fieldwork', 'url')} | {'values': values})
    series['fgw']['observations'] = [{'id': 'fgw-' + day, 'date': day, 'fieldwork': manifest['fgwFieldwork'].get(day), 'url': manifest['series'][0]['sourceUrl'], 'values': values} for day, values in sorted(fgw.items())]
    for item in series.values():
        item['observations'].sort(key=lambda x: x['date'])
        if not item['observations']: raise ValueError('Empty topic series')
        if any(o['date'] > manifest['checkedAt'] for o in item['observations']): raise ValueError('Future observation')
        item['topics'] = sorted({label for obs in item['observations'] for label in obs['values']})
    output = {'version': 1, 'checkedAt': manifest['checkedAt'], 'updatePolicy': 'Geprüfter Datenimport, keine automatische Themenaktualisierung. Die Datierung und Quelle jeder Erhebung sind angegeben.', 'series': list(series.values())}
    target = ROOT / 'src/content/topics.json'
    temporary = target.with_suffix('.tmp'); temporary.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n'); temporary.replace(target)
    print({s['id']: len(s['observations']) for s in series.values()})

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--cache', type=Path, default=Path('/tmp/politik-topic-sources'))
    run(parser.parse_args().cache)
