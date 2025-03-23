import os
import requests
import json
import sys

# Check if the server is running first
print("Checking if server is running...")
try:
    r = requests.get("http://localhost:5001/")
    print(f"Server is running. Status: {r.status_code}, Response: {r.text}")
except Exception as e:
    print(f"Server does not appear to be running: {e}")
    print("IMPORTANT: Make sure the server is running with 'python interview.py' in a separate terminal")
    sys.exit(1)

# Test the interview_sessions directory
print("\nChecking interview_sessions directory...")
sessions_dir = "interview_sessions"
if not os.path.exists(sessions_dir):
    print(f"Directory does NOT exist: {sessions_dir}")
    print("Creating directory...")
    try:
        os.makedirs(sessions_dir, exist_ok=True)
        print("Directory created successfully")
    except Exception as e:
        print(f"Failed to create directory: {e}")
        sys.exit(1)
else:
    print(f"Directory exists: {sessions_dir}")
    if not os.access(sessions_dir, os.W_OK):
        print("Directory is NOT writable - this will cause errors")
        sys.exit(1)
    else:
        print("Directory is writable")

# Test file permissions by writing a test file
print("\nTesting file write permissions...")
test_file = os.path.join(sessions_dir, "test_file.json")
try:
    with open(test_file, 'w') as f:
        json.dump({"test": "data"}, f)
    print(f"Successfully wrote test file: {test_file}")
    os.remove(test_file)
    print("Successfully removed test file")
except Exception as e:
    print(f"File permission error: {e}")
    print("This could be causing the 500 error in your application")
    sys.exit(1)

# Test the start_interview endpoint with debugging
print("\nTesting start_interview endpoint with detailed debugging...")
test_data = {
    'name': 'Test Candidate'
}

try:
    print("Sending request to start_interview...")
    response = requests.post("http://localhost:5001/start_interview", data=test_data)
    
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        print("Response successful!")
        resp_data = response.json()
        print(f"Session ID: {resp_data.get('session_id')}")
        print(f"Success: {resp_data.get('success')}")
        
        # Check if session file was created
        session_file = os.path.join(sessions_dir, f"{resp_data.get('session_id')}.json")
        if os.path.exists(session_file):
            print(f"Session file created: {session_file}")
            # Verify content
            try:
                with open(session_file, 'r') as f:
                    session_content = json.load(f)
                print(f"Session file is valid JSON.")
            except Exception as e:
                print(f"Error reading session file: {e}")
        else:
            print(f"Session file was NOT created! This could be the issue.")
    else:
        print("Error response:", response.text)
except Exception as e:
    print(f"Exception during request: {e}")

print("\nChecking Google GenerativeAI API...")
try:
    import google.generativeai as genai
    print("google.generativeai imported successfully")
    
    # Test API key configuration
    try:
        genai.configure(api_key="AIzaSyDt0zEqI4kJPvA_LFPTBef5ZfWI-QoU5LA")
        model = genai.GenerativeModel("gemini-1.5-flash")
        print("Gemini model created successfully")
        
        # Test a simple generation
        try:
            response = model.generate_content("Hello")
            print("Generated content successfully:", response.text)
        except Exception as e:
            print(f"Error generating content: {e}")
            
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")
        
except ImportError:
    print("Failed to import google.generativeai") 