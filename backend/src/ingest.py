import os
import warnings
from dotenv import load_dotenv

# Suppress PGVector deprecation warning from langchain_community
warnings.filterwarnings("ignore", category=UserWarning, module="langchain_community.vectorstores.pgvector")

load_dotenv()

# ==========================
# Document Loaders
# ==========================
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader, TextLoader

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
    # Separate text and PDF documents
    txt_docs = [doc for doc in documents if doc.metadata.get("source", "").endswith(".txt")]
    pdf_docs = [doc for doc in documents if doc.metadata.get("source", "").endswith(".pdf")]
    
    # Split text documents
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
    )
    txt_chunks = text_splitter.split_documents(txt_docs)
    
    # Split PDF documents into chunks (preserves dense playbook / rulebook resolution)
    pdf_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )
    pdf_chunks = pdf_splitter.split_documents(pdf_docs)
    
    # Combine the split text chunks with split PDF chunks
    final_chunks = txt_chunks + pdf_chunks
    
    # Normalize source paths to use forward slashes for cross-platform compatibility and SQL safety
    for chunk in final_chunks:
        if "source" in chunk.metadata:
            chunk.metadata["source"] = chunk.metadata["source"].replace("\\", "/")
    
    print(f"Created {len(txt_chunks)} chunks from {len(txt_docs)} text documents")
    print(f"Created {len(pdf_chunks)} chunks from {len(pdf_docs)} PDF documents")
    print(f"Total database chunks: {len(final_chunks)}")
    return final_chunks


def build_vectorstore(chunks):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    # Connect directly to Supabase PGVector store using DATABASE_URL
    # Note: PGVector expects the driver "postgresql+psycopg2" in the connection string
    connection_string = os.environ.get("DATABASE_URL", "").replace("postgresql://", "postgresql+psycopg2://")

    print("[DB] Connecting to Supabase, clearing old database, and sending vectors...this may take a moment...")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        vectorstore = PGVector.from_documents(
            documents=chunks,
            embedding=embeddings,
            connection_string=connection_string,
            collection_name="softball_playbook",
            pre_delete_collection=True
        )

    print(f"[SUCCESS] Supabase Database successfully seeded with {len(chunks)} chunks!")
    return vectorstore


def main():
    documents = load_documents()
    chunks = split_documents(documents)
    build_vectorstore(chunks)


if __name__ == "__main__":
    main()