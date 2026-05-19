import streamlit as st
from retriever import build_chain

# --- 1. Page Configuration ---
# Sets up the browser tab title, favicon emoji, and centers the layout
st.set_page_config(
    page_title = "Softball Coach AI",
    page_icon = "🥎",
    layout = "centered"
)

st.title("🥎 Softball Coach AI")
st.caption("Your AI-powered fastpitch coaching assistant.")

# --- 2. Sidebar and Suggested Questions ---
# Create a left sidebar featuring quick-click sample questions for users.
with st.sidebar:
    st.header("💡 Try asking...")
    examples = [
        "What's a good drill for players afraid of ground balls?",
        "How do I structure a 90-minute 12u practice?",
        "My pitcher keeps dropping her elbow, how do I fix it?",
        "How do I teach bunting?",
        "How do I keep players engaged during long practices?"
    ]

    # If a user clicks a button, store that question in session state to process
    for ex in examples:
        if st.button(ex, use_container_width=True):
            st.session_state.pending_question = ex

# --- 3. Session state initialization ---
# Streamlit scripts rerun from top to bottom on every user interaction.
# st.session_state ensures variables survive across those returns.

# Initialize the LangChain RAP pipeline exactly once so it does't reload constantly
if "chain" not in st.session_state:
    with st.spinner("Loading knowledge base..."):
        st.session_state.chain = build_chain()

# Initialize an empty list to keep track of the conversation logs.
if "messages" not in st.session_state:
    st.session_state.messages = []

# Initialize a slot to track quesitons origninating from the sidebar buttons.
if "pending_question" not in st.session_state:
    st.session_state.pending_question = None

# --- 4. Render conversation history ---
# Loops through past interactions stroed in memory and draws them on screen.
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        # If the historic message contains vetorstore sources, render them in an expander
        if msg.get("sources"):
            with st.expander("📚 Sources used"):
                for s in msg["sources"]:
                    st.caption(f"• {s}")

# --- 5. Capture user input ---
# Render the standard chat input bar at the bottom of the page.
chat_input_val = st.chat_input("Ask a coaching question...")

# Determine if the active prompt is from a sidebar click or the manual text input
prompt = None
if st.session_state.pending_question:
    prompt = st.session_state.pending_question
    st.session_state.pending_question = None # reset immediately to prevent infinite loops
elif chat_input_val:
    prompt = chat_input_val

# --- 6. Process new messages and run the AI ---
# Runs only when a new question has been sent.
if prompt:
    # Append user question to history and instantly render it to the chat container
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Generate the assistant's reply
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            # Execute the LangChain pipeline using the unified `.invoke()` method
            result = st.session_state.chain.invoke({"question": prompt})
            answer = result["answer"]

            # Extract document file names from retrieved chunks, cleaning up file paths
            # (Requires `return_source_documents=True` to be enabled in retriever.py)
            sources = list(set([
                doc.metadata.get("source", "Unknown").split('/')[-1] or
                doc.metadata.get("source", "Unknown").split('\\')[-1]
                for doc in result.get("source_documents", [])
            ]))

        # Display the text response
        st.markdown(answer)

        # Display collapsible list of reference documents if any were retrieved
        if sources:
            with st.expander("📚 Sources used"):
                for s in sources:
                    st.caption(f"• {s}")

    # Save the assistant's response and source tracking into history for the next rerun
    st.session_state.messages.append({
        "role": "assistant",
        "content": answer,
        "sources": sources
    })