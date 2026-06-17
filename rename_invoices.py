import os
import re
from datetime import datetime
from pypdf import PdfReader

# Directory
INVOICES_DIR = os.path.abspath('Financial/Invoices')

def parse_month(name):
    name = name.lower()[:3]
    months = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    return months.get(name, 1)

def find_date_in_text(text):
    """Scan text for various date patterns and return YYYY-MM-DD format."""
    # 1. YYYY-MM-DD or YYYY/MM/DD
    match = re.search(r'\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b', text)
    if match:
        year, month, day = map(int, match.groups())
        try:
            datetime(year, month, day)
            return f"{year:04d}-{month:02d}-{day:02d}"
        except ValueError:
            pass
            
    # 2. DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY or MM/DD/YYYY
    match = re.search(r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b', text)
    if match:
        v1, v2, year = map(int, match.groups())
        try:
            if v1 > 12:
                day, month = v1, v2
            elif v2 > 12:
                month, day = v1, v2
            else:
                month, day = v1, v2 # default to MM/DD/YYYY
            datetime(year, month, day)
            return f"{year:04d}-{month:02d}-{day:02d}"
        except ValueError:
            pass
            
    # 3. Textual dates: Month DD, YYYY
    months_pattern = r'(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)'
    match = re.search(rf'\b{months_pattern}\s+(\d{{1,2}})[,\s]+\s*(\d{{4}})\b', text, re.IGNORECASE)
    if match:
        month_name, day, year = match.groups()
        day, year = int(day), int(year)
        month = parse_month(month_name)
        try:
            datetime(year, month, day)
            return f"{year:04d}-{month:02d}-{day:02d}"
        except ValueError:
            pass
            
    # 4. Textual dates: DD Month YYYY
    match = re.search(rf'\b(\d{{1,2}})\s+{months_pattern}\s+(\d{{4}})\b', text, re.IGNORECASE)
    if match:
        day, month_name, year = match.groups()
        day, year = int(day), int(year)
        month = parse_month(month_name)
        try:
            datetime(year, month, day)
            return f"{year:04d}-{month:02d}-{day:02d}"
        except ValueError:
            pass
            
    return None

def extract_text_from_pdf(filepath):
    """Read all text pages of a PDF file using pypdf."""
    try:
        reader = PdfReader(filepath)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF {filepath}: {e}")
        return ""

def rename_invoices():
    if not os.path.exists(INVOICES_DIR):
        print(f"Invoices directory not found at {INVOICES_DIR}")
        return
        
    print(f"Scanning directory: {INVOICES_DIR}...")
    renamed_count = 0
    
    # List all files in Invoices folder
    for filename in os.listdir(INVOICES_DIR):
        filepath = os.path.join(INVOICES_DIR, filename)
        
        # Only process PDF files
        if not (os.path.isfile(filepath) and filename.lower().endswith('.pdf')):
            continue
            
        # Skip if already formatted with a date: e.g. invoice_YYYY-MM-DD_...
        # Matches: invoice_2025-07-26_filename.pdf or similar
        if re.match(r'^invoice_\d{4}-\d{2}-\d{2}_', filename, re.IGNORECASE):
            print(f"Skipping already formatted file: {filename}")
            continue
            
        # Extract text and seek a date
        pdf_text = extract_text_from_pdf(filepath)
        date_str = find_date_in_text(pdf_text)
        
        if date_str:
            # Clean original name (remove prefix 'invoice_' if we want to add date prefix cleanly)
            clean_name = filename
            if filename.lower().startswith('invoice_'):
                clean_name = filename[8:]
            elif filename.lower().startswith('invoice'):
                clean_name = filename[7:]
                
            new_filename = f"invoice_{date_str}_{clean_name}"
            new_filepath = os.path.join(INVOICES_DIR, new_filename)
            
            print(f"Renaming: {filename} -> {new_filename}")
            os.rename(filepath, new_filepath)
            renamed_count += 1
        else:
            print(f"No date found in content of: {filename}")
            
    print(f"Completed. Total invoices renamed: {renamed_count}")

if __name__ == '__main__':
    rename_invoices()
