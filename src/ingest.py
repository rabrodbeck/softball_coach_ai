import os
from dotenv import load_dotenv

load_dotenv()

# ==========================
# Document Loaders
# ==========================
from langchain_community.document_loaders import DirectoryLoader, TextLoader

# ==========================
# Text Splitter
# ==========================
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ==========================
# Embeddings
# ==========================
from langchain_openai import OpenAIEmbeddings

# ==========================
# Vector Store
# ==========================
from langchain_community.vectorstores import Chroma

# ==========================
# Configuration
# ==========================
PERSIST_DIR = "vectorstore"      # ← Changed to root level
DATA_DIR = "data/raw"

def load_documents():
    loader = DirectoryLoader(
        DATA_DIR,
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"}
    )
    documents = loader.load()
    print(f"Loaded {len(documents)} documents from {DATA_DIR}")
    return documents


def split_documents(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks from {len(documents)} documents")
    return chunks


def build_vectorstore(chunks):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Clear old vectorstore if it exists
    if os.path.exists(PERSIST_DIR):
        import shutil
        shutil.rmtree(PERSIST_DIR)
        print(f"Cleared existing vectorstore at: {PERSIST_DIR}")

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=PERSIST_DIR
    )
    
    print(f"✅ Vectorstore successfully created with {len(chunks)} chunks!")
    print(f"✅ Location: {PERSIST_DIR}")
    return vectorstore


def main():
    documents = load_documents()
    chunks = split_documents(documents)
    build_vectorstore(chunks)


if __name__ == "__main__":
    main()