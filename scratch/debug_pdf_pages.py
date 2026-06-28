import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_community.document_loaders import PyPDFLoader

def main():
    pdf_path = os.path.join("data", "raw", "rules_mrf_2026.pdf")
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    
    print(f"Total pages in rules_mrf_2026.pdf: {len(pages)}")
    
    for idx, page in enumerate(pages):
        text = page.page_content
        print(f"\n--- [Page Index {idx}] ---")
        lines = text.split('\n')
        print(f"Header: {lines[0] if lines else ''}")
        print(f"Lines count: {len(lines)}")
        
        has_12u = "12u" in text.lower()
        has_14u = "14u" in text.lower()
        has_pitch = "pitching" in text.lower()
        
        print(f"Keywords: 12U={has_12u}, 14U={has_14u}, Pitching={has_pitch}")
        
        if "maximum of three" in text.lower() or "maximum of 4" in text.lower():
            print(">>> FOUND PITCHING RULES CHUNK:")
            print(text[:400])

if __name__ == "__main__":
    main()
