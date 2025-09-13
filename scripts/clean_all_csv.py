#!/usr/bin/env python3
import argparse
import csv
import os
import re
import sys
from typing import List, Tuple

# Sortie normalisée
TARGET_HEADER = ['Nom', 'Prénom', 'Adresse E-mail', 'Classe', 'Spécialités gardées']

# Helpers

def strip_html(s: str) -> str:
    if not s:
        return ''
    return re.sub(r'<[^>]*>', '', s)


def extract_email(value: str) -> str:
    if not value:
        return ''
    # Si c'est une balise <a href="mailto:...">
    m = re.search(r'mailto:([^"\s>]+)', value)
    if m:
        return m.group(1).strip()
    # Sinon, retirer le HTML résiduel et prendre tel quel
    value = strip_html(value).strip().strip('"')
    return value


def split_full_name(full: str) -> Tuple[str, str]:
    full = (full or '').strip().strip('"')
    if not full:
        return ('', '')
    # Format source: "FAMILY GIVEN" tout en majuscules parfois
    parts = full.split(' ', 1)
    if len(parts) == 2:
        family, given = parts[0].strip(), parts[1].strip()
        return (family, given)
    return (full, '')


def clean_specialties(raw: str) -> str:
    if not raw:
        return ''
    text = strip_html(raw)
    # Séparer par virgules
    parts = [p.strip() for p in re.split(r'[;,]', text) if p.strip()]
    # Conserver uniquement ceux qui contiennent EDS XXX
    eds = []
    for p in parts:
        if re.search(r'\bEDS\b', p, re.IGNORECASE):
            # retirer le préfixe EDS et normaliser
            item = re.sub(r'\bEDS\b', '', p, flags=re.IGNORECASE).strip()
            # garder seulement l'acronyme (MATHS | NSI | PC | SES | SVT | AMC | SC ING etc.)
            # heuristique: prendre premier bloc de lettres majuscules (et espaces)
            m = re.search(r'[A-ZÉÈÎÏÂÇ\s]{2,}', item)
            if m:
                acronym = m.group(0).strip()
            else:
                acronym = item
            # normalisation simple
            acronym = acronym.replace('SC ING', 'SC ING').replace('HGGSP', 'HGGSP')
            acronym = re.sub(r'\s+', ' ', acronym).strip()
            eds.append(acronym)
    # Déduire doublons et joindre
    seen = []
    for e in eds:
        if e not in seen:
            seen.append(e)
    return ' | '.join(seen)


def detect_level_and_class(filename: str, header_row: List[str]) -> Tuple[str, str]:
    base = os.path.basename(filename)
    # Première: G1/G2/G3 dans le nom de fichier
    m = re.search(r'[Gg](\d)', base)
    if m:
        return ('premiere', f'1G{m.group(1)}')
    # Terminale: code classe dans données (ex: T.xx) -> on mappe vers TNSI
    # S'il s'agit du fichier terminale explicite
    if re.search(r'TERMINALE', base, re.IGNORECASE):
        return ('terminale', 'TNSI')
    # fallback
    return ('unknown', '')


def read_rows(filepath: str) -> List[List[str]]:
    with open(filepath, 'r', encoding='utf-8') as f:
        first = f.read(1)
        if first != '\ufeff':
            f.seek(0)
        reader = csv.reader(f, delimiter=';')
        rows = list(reader)
    return rows


def transform_file(filepath: str) -> List[List[str]]:
    rows = read_rows(filepath)
    if not rows:
        return []
    header = rows[0]
    level, default_class = detect_level_and_class(filepath, header)

    output: List[List[str]] = [TARGET_HEADER]

    # indices connus selon les échantillons fournis
    # 0: Nom complet, 4: Adresse E-mail (peut contenir <a> ...), 5: Classe (ex: T.03 ou 1.07), 13: Autres options
    for i, row in enumerate(rows[1:], start=2):
        if not row or len(row) < 6:
            continue
        full_name = row[0] if len(row) > 0 else ''
        email_raw = row[4] if len(row) > 4 else ''
        classe_raw = row[5] if len(row) > 5 else ''
        autres_opts = row[13] if len(row) > 13 else ''

        family, given = split_full_name(full_name)
        email = extract_email(email_raw).lower()

        # Classe normalisée
        if level == 'premiere':
            classe = default_class
        elif level == 'terminale':
            classe = 'TNSI'
        else:
            # heuristique: si champ commence par '1.' => 1G?, sinon TNSI
            if re.match(r'^1\.', classe_raw):
                # sans nom de fichier, impossible de connaître G1/G2/G3, on laisse 1G?
                classe = '1G?'
            else:
                classe = 'TNSI'

        specialites = clean_specialties(autres_opts)

        if not email:
            # ignorer lignes sans email
            continue
        output.append([family, given, email, classe, specialites])
    return output


def write_back(filepath: str, rows: List[List[str]]):
    # Écraser le fichier original
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, delimiter=';')
        for r in rows:
            writer.writerow(r)


def main():
    parser = argparse.ArgumentParser(description='Nettoie et standardise les CSV (Première et Terminale). ÉCRASE les originaux.')
    parser.add_argument('files', nargs='+', help='Fichiers CSV bruts à traiter')
    args = parser.parse_args()

    any_error = False
    for fp in args.files:
        try:
            rows = transform_file(fp)
            if not rows:
                print(f"Avertissement: fichier vide ou non reconnu: {fp}")
                continue
            write_back(fp, rows)
            print(f"OK: {fp} nettoyé et standardisé ({len(rows)-1} lignes)")
        except FileNotFoundError:
            any_error = True
            print(f"ERREUR: fichier introuvable: {fp}")
        except Exception as e:
            any_error = True
            print(f"ERREUR: échec sur {fp}: {e}")

    if any_error:
        sys.exit(1)

if __name__ == '__main__':
    main()
