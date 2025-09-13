import csv
import re
import argparse
import os

def clean_specialties(raw_specialties):
    """Extrait et nettoie les spécialités EDS d'une chaîne brute."""
    if not raw_specialties:
        return ""
    parts = [part.strip() for part in raw_specialties.split(',')]
    eds_parts = [p.replace('EDS', '').strip() for p in parts if p.strip().startswith('EDS')]
    return ' | '.join(eds_parts)

def extract_email(html_string):
    """Extrait une adresse e-mail d'une balise HTML <a>."""
    if not html_string:
        return ""
    match = re.search(r'mailto:([^"\s>]+)', html_string)
    if match:
        return match.group(1)
    return ""

def get_class_name_from_filename(filename):
    """Extrait le numéro de groupe du nom de fichier pour créer le nom de la classe."""
    match = re.search(r'[Gg](\d)', filename)
    if match:
        return f"1G{match.group(1)}"
    return "1G_inconnu"

def main():
    parser = argparse.ArgumentParser(description="Nettoie et transforme les fichiers CSV de Première NSI.")
    parser.add_argument('input_files', nargs='+', help="Un ou plusieurs fichiers CSV de Première à traiter.")
    parser.add_argument('--output_file', default='PREMIERE_NSI_cleaned.csv', help="Fichier CSV de sortie.")
    args = parser.parse_args()

    target_header = ['Nom', 'Prénom', 'Adresse E-mail', 'Classe', 'Spécialités gardées']

    with open(args.output_file, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile, delimiter=';')
        writer.writerow(target_header)

        print(f"Traitement des fichiers : {args.input_files}")
        print(f"Le fichier de sortie sera : {args.output_file}")

        for filepath in args.input_files:
            try:
                class_name = get_class_name_from_filename(os.path.basename(filepath))
                print(f"\nTraitement du fichier : {filepath} (Classe: {class_name})")

                with open(filepath, 'r', encoding='utf-8') as infile:
                    # Gérer un éventuel BOM
                    first = infile.read(1)
                    if first != '\ufeff':
                        infile.seek(0)

                    reader = csv.reader(infile, delimiter=';')
                    try:
                        next(reader)  # Sauter la ligne d'en-tête
                    except StopIteration:
                        continue

                    for row in reader:
                        if len(row) < 14:
                            continue  # Ignore les lignes malformées

                        # 0: Nom complet
                        full_name = (row[0] or '').strip().strip('"')
                        # Séparer: premier mot = nom, reste = prénom (si présent)
                        if ' ' in full_name:
                            nom, prenom = full_name.split(' ', 1)
                        else:
                            nom, prenom = full_name, ''

                        # 4: E-mail sous forme <a href="mailto:...">
                        email = extract_email(row[4])

                        # 13: Autres options -> ne garder que EDS et retirer le préfixe
                        specialites_brutes = row[13]
                        specialites_nettoyees = clean_specialties(specialites_brutes)

                        new_row = [nom, prenom, email, class_name, specialites_nettoyees]
                        writer.writerow(new_row)
                        print(f"  -> Traité : {nom} {prenom}")

            except FileNotFoundError:
                print(f"ERREUR : Le fichier {filepath} n'a pas été trouvé.")
            except Exception as e:
                print(f"ERREUR : Une erreur est survenue lors du traitement de {filepath}: {e}")

    print(f"\nNettoyage terminé. Les données ont été enregistrées dans {args.output_file}")

if __name__ == "__main__":
    main()

