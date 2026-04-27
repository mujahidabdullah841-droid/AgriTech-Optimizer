import streamlit as st
import json
import os
import pandas as pd

def check_oauth_config():
    st.title("🛡️ OAuth Configuration Checkup")
    
    st.write("This tool helps you verify that your Google Cloud settings match your code.")
    
    # 1. Check Secrets / Environment Variables
    st.header("1. Secrets / Environment Check")
    
    client_id = "MISSING"
    project_id = "MISSING"

    # Try Streamlit secrets first
    try:
        if hasattr(st, "secrets") and "google" in st.secrets:
            google_secrets = st.secrets["google"]
            client_id = google_secrets.get("client_id", "MISSING")
            project_id = google_secrets.get("project_id", "MISSING")
    except Exception as e:
        st.warning(f"Note: Could not read Streamlit secrets: {e}")

    # Fallback to environment variables if still MISSING
    if client_id == "MISSING":
        client_id = os.getenv("CLIENT_ID", os.getenv("client_id", "MISSING"))
    if project_id == "MISSING":
        project_id = os.getenv("PROJECT_ID", os.getenv("project_id", "MISSING"))
    
    # Display Results
    if client_id == "MISSING":
        st.error("❌ 'client_id' is missing from .streamlit/secrets.toml and environment variables")
    else:
        st.success(f"✅ Client ID found: `{client_id[:15]}...`")
        
    if project_id == "MISSING":
        st.error("❌ 'project_id' is missing from .streamlit/secrets.toml and environment variables")
    else:
        st.success(f"✅ Project ID found: `{project_id}`")
        
    # Extract Project Number from Client ID
    if client_id != "MISSING" and "-" in client_id:
        try:
            project_num = client_id.split("-")[0]
            st.info(f"💡 **Verification Step:** Go to Google Cloud and ensure your **Project Number** is exactly `{project_num}`.")
        except Exception:
            pass

    # 2. Check Credentials File
    st.header("2. Local Credentials Check")
    if os.path.exists("google_credentials.json"):
        with open("google_credentials.json", "r") as f:
            data = json.load(f)
            web_config = data.get("web", {})
            st.write("Authorized Redirect URIs in your JSON:")
            st.code(web_config.get("redirect_uris", []))
            
            if client_id != "MISSING" and client_id != web_config.get("client_id"):
                st.warning("⚠️ The Client ID in `google_credentials.json` does NOT match your configuration. Delete the file to fix this.")
    else:
        st.warning("⚠️ `google_credentials.json` not found. It will be created when you run the main app.")

    # 3. Step-by-Step Instructions
    st.header("3. Google Console Validation")
    st.markdown(f"""
    Open the **[Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent)** and verify these 3 things:
    
    1. **Project ID:** Does it say `{project_id}` at the top?
    2. **Test Users:** Is the email you are using listed under 'Test users'?
    3. **Publishing Status:** Is it 'Testing'? (If yes, you **must** use an Incognito window to avoid account conflicts).
    """)

    if st.button("Delete credentials file and Reset"):
        if os.path.exists("google_credentials.json"):
            os.remove("google_credentials.json")
            st.success("Deleted! Refresh your main app to regenerate.")
        else:
            st.info("File already deleted.")

if __name__ == "__main__":
    check_oauth_config()
