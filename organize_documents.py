import os
import shutil
import zipfile

# Directories
INVOICES_DIR = os.path.abspath('Financial/Invoices')
RECEIPTS_DIR = os.path.abspath('Financial/Receipts')
REPORTS_DIR = os.path.abspath('Reports')

def docx_contains(path, keyword):
    """Scan DOCX XML document contents for a specific keyword."""
    try:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml').decode('utf-8').lower()
            return keyword.lower() in xml_content
    except Exception:
        return False

def pdf_contains(path, keyword):
    """Scan raw binary data of PDF for the keyword string."""
    try:
        with open(path, 'rb') as f:
            content = f.read().lower()
            return keyword.lower().encode('utf-8') in content
    except Exception:
        return False

def check_keyword(filename, filepath, keyword):
    """Check if the keyword exists in the filename or contents."""
    if keyword.lower() in filename.lower():
        return True
    
    if filename.lower().endswith('.docx'):
        return docx_contains(filepath, keyword)
    elif filename.lower().endswith('.pdf'):
        return pdf_contains(filepath, keyword)
    
    return False

def organize_files():
    # Make sure folders exist
    os.makedirs(INVOICES_DIR, exist_ok=True)
    os.makedirs(RECEIPTS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    
    # Track actions
    moved_count = 0
    
    # Scan current directory (non-recursively)
    for filename in os.listdir('.'):
        filepath = os.path.abspath(filename)
        
        # Only check files, ignore subfolders
        if not os.path.isfile(filepath):
            continue
            
        # Ignore our own script
        if filename == 'organize_documents.py':
            continue
            
        lower_name = filename.lower()
        if not (lower_name.endswith('.pdf') or lower_name.endswith('.docx')):
            continue
            
        # Check for Invoice
        if check_keyword(filename, filepath, 'invoice'):
            dest = os.path.join(INVOICES_DIR, filename)
            print(f"Moving Invoice: {filename} -> Financial/Invoices/")
            shutil.move(filepath, dest)
            moved_count += 1
            
        # Check for Receipt
        elif check_keyword(filename, filepath, 'receipt'):
            dest = os.path.join(RECEIPTS_DIR, filename)
            print(f"Moving Receipt: {filename} -> Financial/Receipts/")
            shutil.move(filepath, dest)
            moved_count += 1
            
        # Other DOCX files go to Reports
        elif lower_name.endswith('.docx'):
            dest = os.path.join(REPORTS_DIR, filename)
            print(f"Moving Report: {filename} -> Reports/")
            shutil.move(filepath, dest)
            moved_count += 1
            
    print(f"File organization completed. Total files categorized: {moved_count}")

if __name__ == '__main__':
    organize_files()
