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

# --- 2. SIDEBAR & SUGGESTED QUESTIONS ---
# Create a left sidebar featuring quick-click sample questions and quick tools.
with st.sidebar:
    st.header("📋 Practice Plans")
    
    # Create the dropdown for the specific age divisions
    selected_division = st.selectbox(
        "Select Division:",
        ["8U Division", "10U Division", "12U Division", "14U Division"],
        index=2  # Defaults to 12U out of the box
    )
    
    # Updated: Swapped out for a clean wood bat emoji and configured the background flags
    if st.button("🥎 Generate Playbook", use_container_width=True):
        macro_prompt = (
            f"Build a comprehensive, structured practice plan template specifically designed for a "
            f"{selected_division} fastpitch softball team. Break the session down into logical, chronological "
            f"segments (e.g., dynamic warmups, fundamental skill stations, team defensive/offensive situations, "
            f"and a high-energy conditioning game). For each section, provide precise timing guidelines, "
            f"clear drill setup instructions, and age-appropriate coaching points focused on player development."
        )
        st.session_state.pending_question = macro_prompt
        # Set a flag so the UI knows to suppress the user chat bubble and history log
        st.session_state.is_sidebar_action = True

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

# Initialize a flag to track if the current query came from a background action.
if "is_sidebar_action" not in st.session_state:
    st.session_state.is_sidebar_action = False

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
is_sidebar = False

if st.session_state.pending_question:
    prompt = st.session_state.pending_question
    is_sidebar = st.session_state.is_sidebar_action
    
    # reset immediately to prevent infinite loops
    st.session_state.pending_question = None 
    st.session_state.is_sidebar_action = False
elif chat_input_val:
    prompt = chat_input_val
    is_sidebar = False

# --- 6. Process new messages and run the AI ---
# This block executes only when 'prompt' contains a value (from typing or the sidebar)
if prompt:
    # 6a. Log and render user input
    if not is_sidebar:
        # Standard typed question: append the question to the permanent historical message list
        st.session_state.messages.append({"role": "user", "content": prompt})

        # render the user's question bubble instantly
        # the 'avatar' argument swaps the generic user icon out for a coach's cap emoji
        with st.chat_message("user", avatar="🧢"):
            st.markdown(prompt)
    else:
        # Sidebar generation click: Skip history logging and draw a clean structural header instead
        st.subheader(f"📝 Custom Playbook: {selected_division}")

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