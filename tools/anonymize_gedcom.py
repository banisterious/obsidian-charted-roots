#!/usr/bin/env python3
"""
GEDCOM Anonymization Tool for Canvas Roots

This script anonymizes personal information in GEDCOM files while preserving
the file structure for debugging purposes. Use this to create shareable test
files when reporting import issues without exposing sensitive genealogical data.

Usage:
    python anonymize_gedcom.py input.ged output.ged
    python anonymize_gedcom.py input.ged output.ged --keep-dates --keep-places

What gets anonymized:
    - Personal names (replaced with "Person 1", "Person 2", etc.)
    - Places (replaced with "Place 1", "Place 2", etc.) unless --keep-places
    - Dates (replaced with placeholder dates) unless --keep-dates
    - Notes and other text content

What gets preserved:
    - GEDCOM structure and syntax
    - Record relationships (family links, parent-child connections)
    - Record types (INDI, FAM, SOUR, etc.)
    - Tag structure and hierarchy

Privacy notice:
    This tool performs basic anonymization suitable for bug reporting. It does NOT
    guarantee complete privacy protection. Review the output file before sharing.
"""

import sys
import re
import argparse
from typing import Dict, Set
from pathlib import Path


class GedcomAnonymizer:
    def __init__(self, keep_dates: bool = False, keep_places: bool = False):
        self.name_map: Dict[str, str] = {}
        self.place_map: Dict[str, str] = {}
        self.keep_dates = keep_dates
        self.keep_places = keep_places
        self.person_counter = 1
        self.place_counter = 1

    def anonymize_name(self, name: str) -> str:
        """Anonymize a personal name."""
        if name not in self.name_map:
            self.name_map[name] = f"Person {self.person_counter}"
            self.person_counter += 1
        return self.name_map[name]

    def anonymize_place(self, place: str) -> str:
        """Anonymize a place name."""
        if self.keep_places:
            return place

        if place not in self.place_map:
            self.place_map[place] = f"Place {self.place_counter}"
            self.place_counter += 1
        return self.place_map[place]

    def anonymize_date(self, date: str) -> str:
        """Anonymize a date."""
        if self.keep_dates:
            return date

        # Preserve date format structure but replace with placeholder
        # Examples: "1 JAN 1900" -> "1 JAN 1900", "ABT 1850" -> "ABT 1900"
        if re.match(r'\d{1,2}\s+\w{3}\s+\d{4}', date):
            return "1 JAN 1900"
        elif re.match(r'(ABT|BEF|AFT|CAL|EST)\s+\d{4}', date):
            prefix = date.split()[0]
            return f"{prefix} 1900"
        elif re.match(r'\d{4}', date):
            return "1900"
        else:
            return date  # Unknown format, keep as-is

    def anonymize_line(self, line: str) -> str:
        """Anonymize a single GEDCOM line."""
        # Extract level, tag, and value
        match = re.match(r'^(\d+)\s+(@[^@]+@\s+)?(\w+)(\s+(.*))?$', line)
        if not match:
            return line

        level, xref, tag, _, value = match.groups()
        value = value or ""

        # Build the base line
        base = f"{level} "
        if xref:
            base += xref
        base += tag

        # Anonymize based on tag type
        if tag == "NAME":
            # NAME tag: anonymize the name
            anon_value = self.anonymize_name(value)
            return f"{base} {anon_value}"

        elif tag == "PLAC":
            # PLAC tag: anonymize place
            anon_value = self.anonymize_place(value)
            return f"{base} {anon_value}"

        elif tag == "DATE":
            # DATE tag: anonymize date
            anon_value = self.anonymize_date(value)
            return f"{base} {anon_value}"

        elif tag in ("NOTE", "TEXT", "CONT", "CONC"):
            # Text content: replace with placeholder
            if value.strip():
                return f"{base} [anonymized text]"
            return f"{base}"

        elif tag in ("GIVN", "SURN", "NPFX", "NSFX", "NICK"):
            # Name parts: anonymize
            if value.strip():
                return f"{base} [anonymized]"
            return f"{base}"

        elif tag in ("ADDR", "ADR1", "ADR2", "CITY", "STAE", "POST", "CTRY"):
            # Address components: anonymize
            if value.strip():
                return f"{base} [anonymized]"
            return f"{base}"

        elif tag in ("PHON", "EMAIL", "WWW", "FAX"):
            # Contact info: anonymize
            if value.strip():
                return f"{base} [anonymized]"
            return f"{base}"

        elif tag == "TITL" and level == "1":
            # Title at level 1 (source title): anonymize
            if value.strip():
                return f"{base} [anonymized]"
            return f"{base}"

        else:
            # Keep other tags as-is (structure, IDs, references)
            if value:
                return f"{base} {value}"
            return f"{base}"

    def anonymize_file(self, input_path: Path, output_path: Path) -> None:
        """Anonymize a GEDCOM file."""
        print(f"Reading from: {input_path}")

        with open(input_path, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()

        print(f"Processing {len(lines)} lines...")

        anonymized_lines = []
        for line in lines:
            # Strip line ending but preserve structure
            line = line.rstrip('\n\r')
            if line.strip():
                anonymized_line = self.anonymize_line(line)
                anonymized_lines.append(anonymized_line)
            else:
                anonymized_lines.append(line)

        print(f"Writing to: {output_path}")

        with open(output_path, 'w', encoding='utf-8') as f:
            for line in anonymized_lines:
                f.write(line + '\n')

        print(f"\nAnonymization complete:")
        print(f"  - {len(self.name_map)} unique names anonymized")
        print(f"  - {len(self.place_map)} unique places anonymized")
        print(f"  - Output saved to: {output_path}")
        print(f"\nPlease review the output file before sharing!")


def main():
    parser = argparse.ArgumentParser(
        description="Anonymize GEDCOM files for bug reporting while preserving structure.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python anonymize_gedcom.py family.ged family_anon.ged
  python anonymize_gedcom.py input.ged output.ged --keep-dates --keep-places

Privacy Notice:
  This tool provides basic anonymization for bug reporting purposes.
  Always review the output file before sharing to ensure no sensitive
  information remains. Dates and places can be preserved for debugging
  structural issues using the --keep-dates and --keep-places flags.
        """
    )

    parser.add_argument(
        'input_file',
        type=str,
        help='Input GEDCOM file to anonymize'
    )

    parser.add_argument(
        'output_file',
        type=str,
        help='Output path for anonymized GEDCOM file'
    )

    parser.add_argument(
        '--keep-dates',
        action='store_true',
        help='Preserve dates in the output (useful for debugging date-related issues)'
    )

    parser.add_argument(
        '--keep-places',
        action='store_true',
        help='Preserve place names in the output (useful for debugging place-related issues)'
    )

    args = parser.parse_args()

    input_path = Path(args.input_file)
    output_path = Path(args.output_file)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    if output_path.exists():
        response = input(f"Warning: {output_path} already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Cancelled.")
            sys.exit(0)

    anonymizer = GedcomAnonymizer(
        keep_dates=args.keep_dates,
        keep_places=args.keep_places
    )

    try:
        anonymizer.anonymize_file(input_path, output_path)
    except Exception as e:
        print(f"Error during anonymization: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
