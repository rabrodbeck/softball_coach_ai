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
# Check if history is empty to display a welcome "whiteboard" banner
if not st.session_state.messages:
    st.info(
        "📋**Coach's Whiteboard Active:** Knowledge base laoded for 8u-14u fastpitch stragegy. "
        "Select a topic on the left or type your situational question below."
    )

for msg in st.session_state.messages:
    # Dynamically select an avatar based on user or coach role
    custom_avatar = "🧢" if msg["role"] == "user" else "🥎"

    with st.chat_message(msg["role"], avatar=custom_avatar):
        st.markdown(msg["content"])
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
# This block executes only when 'prompt' contains a value (from typing or the sidebar)
if prompt:
    # 6a. Log and render user input
    # append the question to the permanent historical message list
    st.session_state.messages.append({"role": "user", "content": prompt})

    # render the user's question bubble instantly
    # the 'avatar' argument swaps the generic user icon out for a coach's cap emoji
    with st.chat_message("user", avatar="🧢"):
        st.markdown(prompt)

    # 6b. Generate AI Response
    # open assistant chat bubble, setting it's icon to a softball emoji
    with st.chat_message("assistant", avatar="🥎"):
        # st.spinner keeps a visual loading wheel on the screen while the llm runs
        # implemented custom themed text ("Drawing up the play...") to fit the app vibe
        with st.spinner("Drawing up the play..."):
            # send the new question along with implicit past chat history to the langchain model
            result = st.session_state.chain.invoke({"question": prompt})
            answer = result["answer"]

            # 6c. Extract and Format sources
            # loop throu the raw document chunks retrieved from the vector database
            # use split('/')[-1] and split('\\')[-1] to strip away messy absolute machine paths
            # and isolate the clean, readable filename
            sources = list(set([
                doc.metadata.get("source", "Unknown").split('/')[-1] or
                doc.metadata.get("source", "Unknown").split('\\')[-1]
                for doc in result.get("source_documents", [])
            ]))

        # 6d. Render AI Output to Screen
        # display the main markdown text response provided by the llm
        st.markdown(answer)

        # If the backend successfully retrieved matching document source chunks,
        # group them inside a clean, drop-down toggle element so they don't clutter the screen
        if sources:
            with st.expander("📚 Sources used"):
                for s in sources:
                    st.caption(f"• {s}")

    # 6e. Persoist conversation state
    # append the final response text and its source referenceds to the historic message list
    # this prevents the answer from disappearing on the next Streamlit rerun loop
    st.session_state.messages.append({
        "role": "assistant",
        "content": answer,
        "sources": sources
    })