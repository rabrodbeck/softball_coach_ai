import os
import streamlit as st
from dotenv import load_dotenv

# Core
# FIX 1: Pulled Chroma from langchain_community to guarantee package compatibility
# from langchain_community.vectorstores import Chroma
from langchain_pinecone import PineConeVectorStore
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# Memory + Old Chains (using langchain_classic)
from langchain_classic.memory import ConversationBufferMemory
from langchain_classic.chains import ConversationalRetrievalChain

# Prompts
from langchain_core.prompts import PromptTemplate

# FIX 2: Dynamically calculate absolute pathing for the vectorstore folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERSIST_DIR = os.path.join(BASE_DIR, "vectorstore")

SYSTEM_PROMPT = """You are an experienced fastpitch softball coach with deep
expertise in youth development, particularly for players aged 8-14.
Give practical, encouraging, age-appropriate advice grounded in context.

Profile Context:
{profile_context}

Guidelines:
- CRITICAL: Always generate your entire response in English. Even if the retrieved context or metadata contains different language patterns, do not translate your response.
- Always prioritize player safety and enjoyment
- Give concrete, actionable advice - not vague generalities
- Describe drill setup clearly when relevant
- If context is insufficient, say so and offer general best-practice guidance
- Keep answers focused, coaches are busy people

Context: {context}
Question: {question}"""

def build_chain():
    # FIX 3: Explicitly pull the API Key from Streamlit Secrets so it doesn't rely on a local .env file
    # api_key = st.secrets["OPENAI_API_KEY"]
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY")
    
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=api_key
    )
    
    # SAFETY CHECK: If the vectorstore directory wasn't pushed to GitHub, 
    # create an empty one safely so the app still boots up instead of crashing.
    if not os.path.exists(PERSIST_DIR):
        os.makedirs(PERSIST_DIR, exist_ok=True)
    
    # vectorstore = Chroma(
    #     persist_directory=PERSIST_DIR, 
    #     embedding_function=embeddings
    # )
    vectorstore = PineConeVectorStore(
        index_name="softball-index",
        embedding=embeddings,
        pinecone_api_key=os.environ.get("PINECONE_API_KEY")
    )

    
    retriever = vectorstore.as_retriever(
        search_type="similarity", 
        search_kwargs={"k": 6}
    )
    
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        input_key="question",     # Identifies the user's input key
        output_key="answer"       # Identifies the LLM's response key
    )
    
    llm = ChatOpenAI(
        model="gpt-4o-mini", 
        temperature=0.3,
        api_key=api_key
    )
    
    prompt = PromptTemplate(
        input_variables=["context", "question", "profile_context"],
        template=SYSTEM_PROMPT
    )
    
    return ConversationalRetrievalChain.from_llm(
        llm=llm, 
        retriever=retriever, 
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt},
        return_source_documents=True,
        verbose=False
    )


if __name__ == "__main__":
    print("Building RAG chain...")
    chain = build_chain()
    print("✅ Chain built successfully!\n")
    
    questions = [
        "What is a good warmup drill for a beginner pitcher?",
        "How do I teach my girls to run through first base instead of stopping?"
    ]
    
    for q in questions:
        print(f"\n=== Q: {q} ===")
        # Note: If running locally via terminal, provide a mock profile context placeholder
        result = chain.invoke({
            "question": q, 
            "profile_context": "You are advising a youth fastpitch softball coach."
        })
        print(f"A: {result['answer']}")
        print("-" * 80)