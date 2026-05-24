import streamlit as st

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "username" not in st.session_state:
    st.session_state.username = None

# --- ALL IMPORTS AND INITIALIZATION HIDDEN SAFELY HERE ---
@st.cache_resource
def initialize_backend_infrastructure():
    """
    Isolates both database and AI components from the main thread execution,
    guaranteeing Streamlit successfully commands Port 8501 first.
    """
    # 1. Lazy import the database routines and validation helpers
    from src.database import (
        init_db, 
        authenticate_coach, 
        register_coach, 
        is_valid_email, 
        validate_password_strength
    )
    init_db()  # Run the SQLite setup inside the safe resource layer
    
    # 2. Lazy import the retriever routines
    from src.retriever import build_chain
    chain_instance = build_chain()
    
    # Return everything we need as a dictionary mapping
    return {
        "authenticate": authenticate_coach,
        "register": register_coach,
        "is_valid_email": is_valid_email,
        "validate_password_strength": validate_password_strength,
        "chain": chain_instance
    }

# --- 1. PAGE CONFIGURATION ---
st.set_page_config(
    page_title = "Softball Coach AI",
    page_icon = "🥎",
    layout = "centered"
)

st.title("🥎 Softball Coach AI")
st.caption("Your AI-powered fastpitch coaching assistant.")

# -- Global backend resolution
infra = initialize_backend_infrastructure()


# --- 2. SESSION STATE INITIALIZATION ---
if "generating" not in st.session_state:
    st.session_state.generating = False

if "access_granted" not in st.session_state:
    st.session_state.access_granted = False

if "active_user" not in st.session_state:
    st.session_state.active_user = None

if "auth_mode" not in st.session_state:
    st.session_state.auth_mode = "menu"

if "chain" not in st.session_state:
    st.session_state.chain = infra["chain"]

if "messages" not in st.session_state:
    st.session_state.messages = []

if "pending_question" not in st.session_state:
    st.session_state.pending_question = None

if "is_sidebar_action" not in st.session_state:
    st.session_state.is_sidebar_action = False

# Captures and carries the raw instruction payload safely across structural reruns
if "active_prompt" not in st.session_state:
    st.session_state.active_prompt = None

# Input buffer queue to prevent double-submission data loss
if "input_buffer_queue" not in st.session_state:
    st.session_state.input_buffer_queue = []


# --- 3. THE 3-WAY GATEWAY PORTAL INTERFACE ---
if not st.session_state.access_granted:
    st.subheader("⚾ Coaching Command Center Portal")
    st.caption("Access your personalized dugout files or explore as a guest.")
    
    # LEVEL A: The Core Hub Choice Selection Menu
    if st.session_state.auth_mode == "menu":
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("🔑 Log In", use_container_width=True):
                st.session_state.auth_mode = "login"
                st.rerun()
                
        with col2:
            if st.button("📋 Create Account", use_container_width=True):
                st.session_state.auth_mode = "register"
                st.rerun()
                
        with col3:
            if st.button("🥎 Continue as Guest", use_container_width=True):
                st.session_state.access_granted = True
                st.session_state.active_user = None  
                st.rerun()

    # LEVEL B: Member Account Secure Sign-In View
    elif st.session_state.auth_mode == "login":
        st.markdown("### 🔑 Coach Login")
        login_user = st.text_input("Username / Email", key="login_user_input")
        login_pwd = st.text_input("Password", type="password", key="login_pwd_input")
        
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Access Boardroom", use_container_width=True, type="primary"):
                user_record = infra["authenticate"](login_user, login_pwd)
                if user_record:
                    st.session_state.access_granted = True
                    st.session_state.active_user = user_record
                    st.success("Credentials verified! Welcome to the dugout.")
                    st.rerun()
                else:
                    st.error("Invalid credentials. Please verify your username and password.")
        with c2:
            if st.button("⬅️ Back to Portal", use_container_width=True, key="back_from_login"):
                st.session_state.auth_mode = "menu"
                st.rerun()

    # LEVEL C: New Account Registration Creation View
    elif st.session_state.auth_mode == "register":
        st.markdown("### 📋 Create Your Coaching Profile")
        st.caption("Username must be a valid email address. Passwords require 8+ characters, with at least 1 uppercase, 1 lowercase, 1 special character (!@#$%^&*) and no spaces.")
                
        new_user = st.text_input("Email", key="reg_user_input")
        new_pwd = st.text_input("Password", type="password", key="reg_pwd_input")
        new_name = st.text_input("Coach Full Name", placeholder="")
        new_loc = st.text_input("Your Location (City, State)", placeholder="")
        new_age = st.selectbox("Primary Age Group Coached", ["8U Division", "10U Division", "12U Division", "14U Division"])
        
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Build Playbook Account", use_container_width=True, type="primary"):
                if not (new_user and new_pwd and new_name and new_loc):
                    st.error("All profile fields are required.")
                
                elif not infra["is_valid_email"](new_user):
                    st.error("Invalid Username. Your username must be a valid email address (e.g., coach@example.com).")
                
                else:
                    is_strong_pwd, pwd_msg = infra["validate_password_strength"](new_pwd)
                    
                    if not is_strong_pwd:
                        st.error(pwd_msg)
                    elif infra["register"](new_user, new_pwd, new_name, new_loc, new_age):
                        st.success("Account created successfully! Redirecting to login...")
                        st.session_state.auth_mode = "login"
                        st.rerun()
                    else:
                        st.error("An account with that email address already exists.")

# --- LEVEL D: ACTIVE RUNTIME APPLICATION WORKSPACE ---
else:
    # --- 4. SIDEBAR CONFIGURATION ---
    with st.sidebar:
        st.header("📋 Practice Plans")
        
        age_options = ["8U Division", "10U Division", "12U Division", "14U Division"]
        
        if st.session_state.active_user is not None:
            user_default_age = st.session_state.active_user["age_group"]
            default_index = age_options.index(user_default_age) if user_default_age in age_options else 2
        else:
            default_index = 2  
            
        selected_division = st.selectbox(
            "Select Division:",
            age_options,
            index=default_index
        )
        
        if st.button("🏏 Generate Playbook", use_container_width=True):
            macro_prompt = (
                f"Build a comprehensive, structured practice plan template specifically designed for a "
                f"{selected_division} fastpitch softball team. Break the session down into logical, chronological "
                f"segments (e.g., dynamic warmups, fundamental skill stations, team defensive/offensive situations, "
                f"and a high-energy conditioning game). For each section, provide precise timing guidelines, "
                f"clear drill setup instructions, and age-appropriate coaching points focused on player development."
            )
            st.session_state.pending_question = macro_prompt
            st.session_state.is_sidebar_action = True


    # --- 5. RENDER CONVERSATION HISTORY ---
    if not st.session_state.messages:
        st.info(
            "📋**Coach's Whiteboard Active:** Knowledge base loaded for 8u-14u fastpitch strategy. "
            "Select a topic on the left or type your situational question below."
        )

    # Establish an explicit streaming target variable before entering the loop
    streaming_target_placeholder = None

    # Clean display hub: handles the rendering for all processed messages
    for idx, msg in enumerate(st.session_state.messages):
        custom_avatar = "🧢" if msg["role"] == "user" else "🥎"
        with st.chat_message(msg["role"], avatar=custom_avatar):
            st.markdown(msg["content"])
            if msg.get("sources"):
                with st.expander("📚 Sources used"):
                    for s in msg["sources"]:
                        st.caption(f"• {s}")
                        
        # Drop the placeholder anchor immediately following the last user message,
        # but only if the generation cycle flag is officially raised.
        if st.session_state.generating and idx == len(st.session_state.messages) - 1:
            if msg["role"] == "user":
                streaming_target_placeholder = st.empty()


    # --- 6. CAPTURE USER INPUT ---
    chat_input_val = st.chat_input("Ask a coaching question...")

    if chat_input_val:
        st.session_state.input_buffer_queue.append(chat_input_val)

    if st.session_state.pending_question:
        st.session_state.active_prompt = st.session_state.pending_question
        display_prompt = f"📋 *Generated {selected_division} Playbook Template* "
        st.session_state.messages.append({"role": "user", "content": display_prompt})
        
        st.session_state.pending_question = None 
        st.session_state.is_sidebar_action = False
        st.session_state.generating = True  # Raise processing flag
        st.rerun()
        
    elif st.session_state.input_buffer_queue and not st.session_state.active_prompt:
        next_up = st.session_state.input_buffer_queue.pop(0)
        st.session_state.active_prompt = next_up
        st.session_state.messages.append({"role": "user", "content": next_up})
        st.session_state.generating = True  # Raise processing flag
        st.rerun()


    # --- 7. LIVE IN-FLIGHT GENERATION LAYER ---
    # Target our pre-allocated layout anchor built inside the history loop
    if st.session_state.generating and streaming_target_placeholder is not None:
        
        if st.session_state.active_prompt:
            raw_question = st.session_state.active_prompt
        else:
            raw_question = st.session_state.messages[-1]["content"]
        
        if st.session_state.active_user is not None:
            profile = st.session_state.active_user
            profile_context_string = (
                f"You are directly advising Coach {profile['coach_name']}, based out of {profile['location']}. "
                f"They are the head coach of a competitive {profile['age_group']} fastpitch softball team. "
                f"Tailor all strategic advice, drill progressions, athletic expectations, and safety instructions "
                f"specifically to the developmental physiology and mental milestones of {profile['age_group']} players."
            )
        else:
            profile_context_string = (
                f"You are directly advising a fastpitch softball coach running a developmental youth team. "
                f"Provide structurally sound coaching advice, age-appropriate drill breakdowns, and technical "
                f"guidance aligned with progressive youth athletic development frameworks."
            )

        # Pre-fetch context elements seamlessly before targeting our rendering window
        with st.spinner("Analyzing playbook history..."):
            retrieved_docs = st.session_state.chain.retriever.invoke(raw_question)
            
            sources = list(set([
                doc.metadata.get("source", "Unknown").split('/')[-1] or
                doc.metadata.get("source", "Unknown").split('\\')[-1]
                for doc in retrieved_docs
            ]))

        # Helper generator to normalize incoming text chunks
        def get_stream_chunks():
            token_stream = st.session_state.chain.stream({
                "profile_context": profile_context_string,
                "question": raw_question
            })
            for chunk in token_stream:
                if isinstance(chunk, dict) and "answer" in chunk:
                    yield chunk["answer"]
                elif isinstance(chunk, str):
                    yield chunk

        # Stream directly into the persistent layout slot managed by Section 5
        with streaming_target_placeholder.container():
            with st.chat_message("assistant", avatar="🥎"):
                full_response = st.write_stream(get_stream_chunks())
                if sources:
                    with st.expander("📚 Sources used"):
                        for s in sources:
                            st.caption(f"• {s}")

        # Commit final payload directly to history array for downstream passes
        st.session_state.messages.append({
            "role": "assistant",
            "content": full_response,
            "sources": sources
        })
        
        # Clear out state control registers safely
        st.session_state.active_prompt = None
        st.session_state.generating = False  # Lower processing flag
        
        # Force an instantaneous structural rerun. This guarantees Section 5 takes 
        # official ownership of the newly added message element, locking the DOM 
        # layout state before any downstream race conditions or interactions occur.
        st.rerun()