import sys
import os
# Add the project root directory to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from src.retriever import get_vectorstore

def main():
    load_dotenv()
    
    # 1. Access the vector store
    vectorstore = get_vectorstore()
    
    # 2. Test query (should match the baserunning PDF rules or drills)
    query = "delay steal baserunning"
    print(f"🔍 Performing vector search for: '{query}'...\n")
    
    # 3. Retrieve documents
    docs = vectorstore.similarity_search(query, k=3)
    
    # 4. Print results
    if not docs:
        print("❌ No matching documents found in the vector store.")
        return
        
    for idx, doc in enumerate(docs):
        print(f"--- [Result {idx + 1}] ---")
        source = doc.metadata.get("source", "Unknown Source")
        page = doc.metadata.get("page", "N/A")
        print(f"📍 Source File: {source} (Page {page})")
        print(f"📝 Content Preview:\n{doc.page_content[:300]}...\n")

if __name__ == "__main__":
    main()
