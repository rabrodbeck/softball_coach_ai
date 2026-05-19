import os
from dotenv import load_dotenv

# Core
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# Memory + Old Chains (using langchain_classic)
from langchain_classic.memory import ConversationBufferMemory
# FIX 1: Corrected typo (Conversational) and simplified import path
from langchain_classic.chains import ConversationalRetrievalChain

# Prompts
from langchain_core.prompts import PromptTemplate

load_dotenv()

PERSIST_DIR = "vectorstore"

# FIX 2: Removed {chat_history} from this prompt, as the chain handles history 
# in an upstream step and won't pass it to this specific template.
SYSTEM_PROMPT = """You are an experienced fastpitch softball coach with deep
expertise in youth development, particularly for players aged 8-14.
Give practical, encouraging, age-appropriate advice grounded in context.

Guidelines:
- Always prioritize player safety and enjoyment
- Give concrete, actionable advice - not vague generalities
- Describe drill setup clearly when relevant
- If context is insufficient, say so and offer general best-practice guidance
- Keep answers focused, coaches are busy people

Context: {context}
Question: {question}"""

def build_chain():
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    vectorstore = Chroma(
        persist_directory=PERSIST_DIR, 
        embedding_function=embeddings
    )
    
    retriever = vectorstore.as_retriever(
        search_type="similarity", 
        search_kwargs={"k": 6}
    )
    
    memory = ConversationBufferMemory(
        memory_key="chat_history", 
        return_messages=True, 
        output_key="answer"
    )
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    # FIX 2 (cont.): Updated input_variables to match the template
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=SYSTEM_PROMPT
    )
    
    return ConversationalRetrievalChain.from_llm(
        llm=llm, 
        retriever=retriever, 
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt},
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
        # FIX 3: Swapped to the modern .invoke() syntax
        result = chain.invoke({"question": q})
        print(f"A: {result['answer']}")
        print("-" * 80)