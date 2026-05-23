import streamlit as st
from retriever import build_chain
# Import our newly built database connection routines directly
from database import init_db, authenticate_coach, register_coach

# --- 1. PAGE CONFIGURATION ---
# Sets up the browser tab title, favicon emoji, and centers the layout
st.set_page_config(
    page_title = "Softball Coach AI",
    page_icon = "🥎",
    layout = "centered"
)

st.title("🥎 Softball Coach AI")
st.caption("Your AI-powered fastpitch coaching assistant.")


# --- 2. SESSION STATE INITIALIZATION ---
# Initialize internal flags to govern dashboard security, guest states, and forms.
if "access_granted" not in st.session_state:
    st.session_state.access_granted = False

if "active_user" not in st.session_state:
    st.session_state.active_user = None

if "auth_mode" not in st.session_state:
    st.session_state.auth_mode = "menu"

if "chain" not in st.session_state:
    with st.spinner("Loading knowledge base..."):
        st.session_state.chain = build_chain()

if "messages" not in st.session_state:
    st.session_state.messages = []

if "pending_question" not in st.session_state:
    st.session_state.pending_question = None

if "is_sidebar_action" not in st.session_state:
    st.session_state.is_sidebar_action = False

# Auto-initialize the local file system database on setup run
init_db()

# --- 3. THE 3-WAY GATEWAY PORTAL INTERFACE ---
# Intercepts users who haven't logged in or bypassed via guest mode.
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
            # GUEST FLOW ROUTE: Grant access immediately with zero profile constraints
            if st.button("🥎 Continue as Guest", use_container_width=True):
                st.session_state.access_granted = True
                st.session_state.active_user = None  # None cleanly marks a Guest identity
                st.rerun()

    # LEVEL B: Member Account Secure Sign-In View
    elif st.session_state.auth_mode == "login":
        st.markdown("### 🔑 Coach Login")
        login_user = st.text_input("Username / Email", key="login_user_input")
        login_pwd = st.text_input("Password", type="password", key="login_pwd_input")
        
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Access Boardroom", use_container_width=True, type="primary"):
                user_record = authenticate_coach(login_user, login_pwd)
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

        # Guide the user on requirements
        st.caption("Username must be a valid email address. Passwords require 8+ characters, with at least 1 uppercase, 1 lowercase, 1 special character (!@#$%^&*) and no spaces.")
                
        new_user = st.text_input("Email", key="reg_user_input")
        new_pwd = st.text_input("Password", type="password", key="reg_pwd_input")
        new_name = st.text_input("Coach Full Name", placeholder="")
        new_loc = st.text_input("Your Location (City, State)", placeholder="")
        new_age = st.selectbox("Primary Age Group Coached", ["8U Division", "10U Division", "12U Division", "14U Division"])

        # Pull in the validation helpers from database.py
        from database import is_valid_email, validate_password_strength
        
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Build Playbook Account", use_container_width=True, type="primary"):
                if not (new_user and new_pwd and new_name and new_loc):
                    st.error("All profile fields are required.")
                
                # 1. Enforce email format for username
                elif not is_valid_email(new_user):
                    st.error("Invalid Username. Your username must be a valid email address (e.g., coach@example.com).")
                
                else:
                    # 2. Enforce password complexity rules
                    is_strong_pwd, pwd_msg = validate_password_strength(new_pwd)
                    
                    if not is_strong_pwd:
                        st.error(pwd_msg)
                    
                    # 3. If both pass, try writing to SQLite database
                    elif register_coach(new_user, new_pwd, new_name, new_loc, new_age):
                        st.success("Account created successfully! Redirecting to login...")
                        st.session_state.auth_mode = "login"
                        st.rerun()
                    else:
                        st.error("An account with that email address already exists.")
        with c2:
            if st.button("⬅️ Back to Portal", use_container_width=True):
                st.session_state.auth_mode = "menu"
                st.rerun()

# --- LEVEL D: ACTIVE RUNTIME APPLICATION WORKSPACE ---
# Executes only if the access_granted flag resolves to True
else:
    # --- 4. SIDEBAR CONFIGURATION ---
    with st.sidebar:
        st.header("📋 Practice Plans")
        
        age_options = ["8U Division", "10U Division", "12U Division", "14U Division"]
        
        # Dynamically set index based on identity context (Member vs Guest)
        if st.session_state.active_user is not None:
            user_default_age = st.session_state.active_user["age_group"]
            default_index = age_options.index(user_default_age) if user_default_age in age_options else 2
        else:
            default_index = 2  # Fall back directly to 12U if visiting as a guest
            
        selected_division = st.selectbox(
            "Select Division:",
            age_options,
            index=default_index
        )
        
        # Action execution hook configured with clean cricket-bat visual emoji
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
    # Welcome banner appears only if history logs are clean
    if not st.session_state.messages:
        st.info(
            "📋**Coach's Whiteboard Active:** Knowledge base loaded for 8u-14u fastpitch strategy. "
            "Select a topic on the left or type your situational question below."
        )

    for msg in st.session_state.messages:
        custom_avatar = "🧢" if msg["role"] == "user" else "🥎"
        with st.chat_message(msg["role"], avatar=custom_avatar):
            st.markdown(msg["content"])
            if msg.get("sources"):
                with st.expander("📚 Sources used"):
                    for s in msg["sources"]:
                        st.caption(f"• {s}")


    # --- 6. CAPTURE USER INPUT ---
    chat_input_val = st.chat_input("Ask a coaching question...")

    prompt = None
    is_sidebar = False

    # Extract prompt source origin to cleanly route history containers
    if st.session_state.pending_question:
        prompt = st.session_state.pending_question
        is_sidebar = st.session_state.is_sidebar_action
        
        st.session_state.pending_question = None 
        st.session_state.is_sidebar_action = False
    elif chat_input_val:
        prompt = chat_input_val
        is_sidebar = False

    # --- 7. PROCESS NEW MESSAGES AND RUN AI ---
    if prompt:
        # Handle structural rendering for text versus button operations
        if not is_sidebar:
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user", avatar="🧢"):
                st.markdown(prompt)
        else:
            st.subheader(f"📝 Custom Playbook: {selected_division}")

        with st.chat_message("assistant", avatar="🥎"):
            with st.spinner("Drawing up the play..."):
                
                # ROUTING CHECK: Construct personalized instructions if a profile is present
                if st.session_state.active_user is not None:
                    profile = st.session_state.active_user
                    profile_context_string = (
                        f"You are directly advising Coach {profile['coach_name']}, based out of {profile['location']}. "
                        f"They are the head coach of a competitive {profile['age_group']} fastpitch softball team. "
                        f"Tailor all strategic advice, drill progressions, athletic expectations, and safety instructions "
                        f"specifically to the developmental physiology and mental milestones of {profile['age_group']} players."
                    )
                else:
                    # GUEST CONTEXT: Fall back to standard developmental framework routing
                    profile_context_string = (
                        f"You are directly advising a fastpitch softball coach running a developmental youth team. "
                        f"Provide structurally sound coaching advice, age-appropriate drill breakdowns, and technical "
                        f"guidance aligned with progressive youth athletic development frameworks."
                    )

                # Send both context payload parameters to the retriever module chain
                result = st.session_state.chain.invoke({
                    "profile_context": profile_context_string,
                    "question": prompt
                })
                answer = result["answer"]

                sources = list(set([
                    doc.metadata.get("source", "Unknown").split('/')[-1] or
                    doc.metadata.get("source", "Unknown").split('\\')[-1]
                    for doc in result.get("source_documents", [])
                ]))

            st.markdown(answer)

            if sources:
                with st.expander("📚 Sources used"):
                    for s in sources:
                        st.caption(f"• {s}")

        # Persist data states to history arrays so details survive refreshes
        st.session_state.messages.append({
            "role": "assistant",
            "content": answer,
            "sources": sources
        })    

