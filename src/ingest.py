import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader, TextLoader

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
from langchain_community.vectorstores import PGVector

# ==========================
# Configuration
# ==========================
PERSIST_DIR = "vectorstore"      # ← Changed to root level
DATA_DIR = "data/raw"

def load_documents():
    
    # Load all txt document
    txt_loader = DirectoryLoader(
        DATA_DIR,
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"}
    )
    txt_documents = txt_loader.load()

    # Load all PDF documents
    pdf_loader = DirectoryLoader(
        DATA_DIR,
        glob="**/*.pdf",
        loader_cls=PyPDFLoader
    )
    pdf_documents = pdf_loader.load()

    # Combine all
    documents = txt_documents + pdf_documents

    print(f"Loaded {len(txt_documents)} text documents and {len(pdf_documents)} PDF documents from {DATA_DIR}")
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

    # Connect directly to Supabase PGVector store using DATABASE_URL
    # Note: PGVector expects the driver "postgresql+psycopg2" in the connection string
    connection_string = os.environ.get("DATABASE_URL", "").replace("postgresql://", "postgresql+psycopg2://")

    print("⌛ Conencting to Supabase and sending vectors...this may take a moment...")

    vectorstore = PGVector.from_documents(
        documents=chunks,
        embedding=embeddings,
        connection_string=connection_string,
        collection_name="softball_playbook"
    )

    print(f"✅ Supabase Database successfully seeded with {len(chunks)} chunks!")
    return vectorstore


def main():
    documents = load_documents()
    chunks = split_documents(documents)
    build_vectorstore(chunks)


if __name__ == "__main__":
    main()