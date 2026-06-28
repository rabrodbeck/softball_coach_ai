import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from src.retriever import get_vectorstore

def main():
    load_dotenv()
    vectorstore = get_vectorstore()
    
    queries = [
        "12u pitching innings limit rules_mrf_2026",
        "How many innings can a player pitch in 12u"
    ]
    
    for query in queries:
        print(f"\n[QUERY] Searching for: '{query}'")
        docs = vectorstore.similarity_search(query, k=5)
        for idx, doc in enumerate(docs):
            source = doc.metadata.get("source", "Unknown Source")
            page = doc.metadata.get("page", "N/A")
            print(f"\n--- [Result {idx + 1}] Source: {source} (Page {page}) ---")
            # Replace non-ascii chars to avoid print crashes
            safe_content = doc.page_content.encode('ascii', errors='replace').decode('ascii')
            print(safe_content)

if __name__ == "__main__":
    main()
