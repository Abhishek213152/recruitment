from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import google.generativeai as genai
import os
import json
import time
import tempfile
import PyPDF2
import docx2txt
import io
import uuid
from google.cloud import texttospeech

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Requests

# Configure Gemini API Key
genai.configure(api_key="AIzaSyDt0zEqI4kJPvA_LFPTBef5ZfWI-QoU5LA")  # Replace with actual API key

# Initialize Text-to-Speech client
tts_client = None
local_tts = None
using_cloud_tts = False

try:
    # First try Google Cloud TTS
    tts_client = texttospeech.TextToSpeechClient()
    print("Text-to-Speech client initialized successfully")
    using_cloud_tts = True
except Exception as e:
    print(f"Warning: Could not initialize Text-to-Speech client: {e}")
    tts_client = None
    
# Always try to initialize local TTS regardless of Google Cloud status
try:
    # Try to use pyttsx3 for local TTS
    import pyttsx3
    local_tts = pyttsx3.init()
    # Test if the engine works
    test_voices = local_tts.getProperty('voices')
    print(f"Local TTS initialized successfully with {len(test_voices)} voices")
    if not using_cloud_tts:
        print("Using local TTS as primary voice engine")
except Exception as local_e:
    print(f"Warning: Could not initialize local TTS: {local_e}")
    if not using_cloud_tts:
        print("No TTS systems available - voice functionality will not work")

# Create directory for interview sessions and audio files
SESSIONS_DIR = "interview_sessions"
AUDIO_DIR = "audio_files"
os.makedirs(SESSIONS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

@app.route("/")
def home():
    return "Hello, World!"
    
@app.route('/start_interview', methods=['POST'])
def start_interview():
    """Start a new interview session by processing resume and candidate info"""
    try:
        # Get candidate name from form data
        name = request.form.get('name', 'Candidate')
        
        # Voice mode is always enabled (ignore client setting)
        voice_mode = True
        
        # Get resume file
        resume_file = request.files.get('resume')
        resume_text = ""
        
        if resume_file:
            temp_file_path = None
            try:
                print(f"Processing resume file: {resume_file.filename}, {resume_file.content_type}")
                
                # Create a temporary file to store the resume
                temp_file_handle, temp_file_path = tempfile.mkstemp(suffix=os.path.splitext(resume_file.filename)[1])
                os.close(temp_file_handle)  # Close the file handle immediately
                
                print(f"Created temporary file: {temp_file_path}")
                
                # Save the uploaded file to the temporary file
                resume_file.save(temp_file_path)
                print(f"Saved uploaded file to temporary location")
                
                # Extract text based on file type
                file_extension = os.path.splitext(resume_file.filename)[1].lower()
                print(f"Detected file extension: {file_extension}")
                
                if file_extension == '.pdf':
                    # Extract text from PDF
                    try:
                        with open(temp_file_path, 'rb') as file:
                            pdf_reader = PyPDF2.PdfReader(file)
                            for page in pdf_reader.pages:
                                resume_text += page.extract_text()
                    except Exception as pdf_error:
                        print(f"Error reading PDF: {pdf_error}")
                        resume_text = f"Error extracting text from PDF: {pdf_error}"
                
                elif file_extension in ['.docx', '.doc']:
                    # Extract text from Word document
                    try:
                        resume_text = docx2txt.process(temp_file_path)
                    except Exception as doc_error:
                        print(f"Error reading DOC/DOCX: {doc_error}")
                        resume_text = f"Error extracting text from document: {doc_error}"
                
                elif file_extension in ['.txt', '.rtf']:
                    # Read plain text file
                    try:
                        with open(temp_file_path, 'r', encoding='utf-8') as file:
                            resume_text = file.read()
                    except Exception as txt_error:
                        print(f"Error reading text file: {txt_error}")
                        resume_text = f"Error extracting text from file: {txt_error}"
                
            except Exception as file_error:
                print(f"Error processing resume file: {file_error}")
                resume_text = f"Error processing resume: {file_error}"
            
            finally:
                # Clean up the temporary file in the finally block to ensure it always happens
                if temp_file_path and os.path.exists(temp_file_path):
                    try:
                        os.unlink(temp_file_path)
                    except Exception as delete_error:
                        print(f"Warning: Could not delete temporary file {temp_file_path}: {delete_error}")
        
        # Create a new session ID
        session_id = f"interview_{int(time.time())}"
        
        # Initialize the interview with Gemini
        interview_intro = initialize_interview(name, resume_text)
        
        # Generate audio if voice mode is enabled
        audio_file_path = None
        if voice_mode:  # Remove the tts_client check to allow local TTS to work
            try:
                # Generate a unique audio file name
                audio_file_name = f"intro_{uuid.uuid4()}.mp3"
                audio_file_path = os.path.join(AUDIO_DIR, audio_file_name)
                
                # Generate speech from text
                result_path = generate_speech(interview_intro, audio_file_path)
                # Use the returned path which might be different if using WAV
                if result_path and result_path != audio_file_path:
                    audio_file_path = result_path
                
                print(f"Generated audio for introduction: {audio_file_path}")
            except Exception as audio_error:
                print(f"Error generating audio: {audio_error}")
                audio_file_path = None
        
        # Save the session
        session_data = {
            "session_id": session_id,
            "candidate_name": name,
            "resume_text": resume_text,
            "voice_mode": voice_mode,
            "conversation": [
                {"role": "system", "content": "Interview Started"},
                {"role": "assistant", "content": interview_intro}
            ],
            "skills_assessment": {},
            "timestamp": time.time()
        }
        
        if not save_session(session_id, session_data):
            return jsonify({
                "success": False,
                "error": "Failed to save session data. Please try again."
            }), 500
        
        response_data = {
            "success": True,
            "session_id": session_id,
            "message": interview_intro
        }
        
        # Add audio URL to response if voice mode is enabled
        if voice_mode and audio_file_path:
            response_data["audio_url"] = f"/get_audio/{os.path.basename(audio_file_path)}"
        
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error starting interview: {e}")
        print(f"Detailed error: {error_details}")
        return jsonify({
            "success": False,
            "error": str(e),
            "details": error_details
        }), 500

@app.route('/interview_response', methods=['POST'])
def interview_response():
    """Process candidate's response and continue the interview"""
    data = request.json
    session_id = data.get('session_id')
    user_message = data.get('message')
    
    if not session_id or not user_message:
        return jsonify({"error": "Missing session_id or message"}), 400
    
    try:
        # Load the session
        session_data = load_session(session_id)
        if not session_data:
            return jsonify({"error": "Session not found"}), 404
        
        # Check if voice mode is enabled
        voice_mode = session_data.get('voice_mode', False)
        
        # Update conversation history
        session_data["conversation"].append({"role": "user", "content": user_message})
        
        # Get AI response
        ai_response = get_next_interview_question(session_data)
        
        # Update conversation with AI response
        session_data["conversation"].append({"role": "assistant", "content": ai_response})
        
        # Generate audio if voice mode is enabled
        audio_file_path = None
        if voice_mode:  # Remove the tts_client check to allow local TTS to work
            try:
                # Generate a unique audio file name
                audio_file_name = f"response_{uuid.uuid4()}.mp3"
                audio_file_path = os.path.join(AUDIO_DIR, audio_file_name)
                
                # Generate speech from text
                result_path = generate_speech(ai_response, audio_file_path)
                # Use the returned path which might be different if using WAV
                if result_path and result_path != audio_file_path:
                    audio_file_path = result_path
                
                print(f"Generated audio for response: {audio_file_path}")
            except Exception as audio_error:
                print(f"Error generating audio: {audio_error}")
                audio_file_path = None
        
        # Save updated session
        save_session(session_id, session_data)
        
        response_data = {
            "success": True,
            "message": ai_response
        }
        
        # Add audio URL to response if voice mode is enabled
        if voice_mode and audio_file_path:
            response_data["audio_url"] = f"/get_audio/{os.path.basename(audio_file_path)}"
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error processing interview response: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/end_interview', methods=['POST'])
def end_interview():
    """End the interview and get final assessment"""
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({"error": "Missing session_id"}), 400
    
    try:
        # Load the session
        session_data = load_session(session_id)
        if not session_data:
            return jsonify({"error": "Session not found"}), 404
        
        # Generate final assessment
        final_assessment = generate_final_assessment(session_data)
        
        # Update session with final assessment
        session_data["final_assessment"] = final_assessment
        session_data["status"] = "completed"
        
        # Save updated session
        save_session(session_id, session_data)
        
        return jsonify({
            "success": True,
            "assessment": final_assessment
        })
        
    except Exception as e:
        print(f"Error ending interview: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def initialize_interview(name, resume_text):
    """Initialize the interview using Gemini API"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Truncate resume text if it's too long (Gemini has context limits)
        max_resume_length = 5000  # Characters, not tokens
        if len(resume_text) > max_resume_length:
            print(f"Resume too long ({len(resume_text)} chars), truncating to {max_resume_length} chars")
            resume_text = resume_text[:max_resume_length] + "... [truncated for length]"
        
        prompt = f"""
        You are an AI technical interviewer named TechInterviewer. 
        You will conduct a technical interview with {name}.
        
        Here is their resume:
        {resume_text}
        
        Based on this resume, conduct a technical interview focusing on their skills and experience.
        Keep these guidelines in mind:
        1. Start with a friendly introduction (e.g., "Hello" or "Good day")
        2. Ask only ONE brief question about their background or a specific skill from their resume
        3. Be conversational and encouraging
        4. Use short sentences that are easy to speak aloud
        5. Avoid long explanations or multiple questions in a row
        
        Begin the interview with a brief introduction and your first question.
        IMPORTANT: Keep your response under 100 words, using simple sentences that are easy to speak aloud.
        """
        
        try:
            print("Generating interview introduction with Gemini...")
            response = model.generate_content(prompt)
            result = response.text.strip()
            print("Successfully generated interview introduction")
            return result
        except Exception as e:
            print(f"Error generating content with Gemini: {e}")
            import traceback
            print(f"Gemini traceback: {traceback.format_exc()}")
            raise
    except Exception as e:
        print(f"Error initializing interview: {e}")
        return f"Hello, {name}! I'm TechInterviewer, an AI assistant. Let's begin our technical interview. Could you tell me a bit about your background?"

def get_next_interview_question(session_data):
    """Generate the next interview question based on conversation history"""
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Extract conversation history
    conversation = session_data["conversation"]
    resume_text = session_data.get("resume_text", "")
    candidate_name = session_data.get("candidate_name", "Candidate")
    
    # Format conversation for the prompt
    conversation_text = ""
    for msg in conversation[-5:]:  # Only use the last 5 messages for context
        role = msg["role"]
        if role == "system":
            continue
        content = msg["content"]
        conversation_text += f"{'You' if role == 'assistant' else candidate_name}: {content}\n\n"
    
    prompt = f"""
    You are TechInterviewer, an AI technical interviewer.
    You are conducting an interview with {candidate_name}.
    
    Resume highlights:
    {resume_text[:500]}...
    
    Recent conversation:
    {conversation_text}
    
    Continue the interview with an appropriate technical question or response.
    Focus on ONE of these areas:
    1. Programming skills and technical knowledge
    2. Problem-solving abilities
    3. Previous work experience
    4. Projects and achievements
    
    Guidelines:
    - Ask only ONE question at a time
    - Use short, clear sentences that are easy to speak aloud
    - If they ask you a question, provide a brief response and then ask your next question
    - Avoid long explanations
    - Use a warm but professional tone
    
    IMPORTANT: Your response must be under 75 words total and easy to speak aloud.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating next question: {e}")
        return "That's interesting. I'm curious - could you tell me more about a challenging project you've worked on recently?"

def generate_final_assessment(session_data):
    """Generate a final assessment of the candidate"""
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Extract conversation history
    conversation = session_data["conversation"]
    resume_text = session_data.get("resume_text", "")
    candidate_name = session_data.get("candidate_name", "Candidate")
    
    # Format conversation for the prompt
    conversation_text = ""
    for msg in conversation:
        role = msg["role"]
        if role == "system":
            continue
        content = msg["content"]
        conversation_text += f"{'TechInterviewer' if role == 'assistant' else candidate_name}: {content}\n\n"
    
    prompt = f"""
You are an AI technical interviewer named TechInterviewer.
You speak in a warm and conversational tone, similar to a friendly professor or experienced HR professional.

You have conducted a technical interview with {candidate_name}.
    
Resume:
{resume_text[:1000]}...
    
Interview conversation:
{conversation_text}
    
Based on this interview, provide a comprehensive assessment of the candidate including:
1. Technical skills assessment
2. Communication skills
3. Problem-solving abilities
4. Cultural fit
5. Strengths and weaknesses
6. Overall impression
7. Recommendations for improvement

Format your assessment as JSON with these sections.
"""
    
    try:
        response = model.generate_content(prompt)
        assessment_text = response.text.strip()
        
        # Try to parse as JSON
        try:
            # Clean up response if it contains code blocks
            if assessment_text.startswith("```json"):
                assessment_text = assessment_text[7:]
            elif assessment_text.startswith("```"):
                assessment_text = assessment_text[3:]
            
            if assessment_text.endswith("```"):
                assessment_text = assessment_text[:-3]
            
            assessment_json = json.loads(assessment_text.strip())
            return assessment_json
        except json.JSONDecodeError:
            # If not valid JSON, return as text
            return {"text_assessment": assessment_text}
        
    except Exception as e:
        print(f"Error generating final assessment: {e}")
        return {
            "text_assessment": f"Assessment for {candidate_name}: Thank you for participating in this technical interview. You showed promising skills, and I recommend further evaluation to make a complete assessment."
        }

def save_session(session_id, data):
    """Save session data to file"""
    try:
        # Ensure the sessions directory exists
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        
        session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        print(f"Saving session to: {session_file}")
        
        # Use a temporary file for atomic write
        temp_session_file = f"{session_file}.tmp"
        with open(temp_session_file, 'w') as f:
            json.dump(data, f)
        
        # Rename the temporary file to the actual file (atomic operation)
        if os.path.exists(session_file):
            os.unlink(session_file)  # Remove existing file if it exists
        os.rename(temp_session_file, session_file)
        
        print(f"Session saved successfully")
        return True
    except Exception as e:
        print(f"Error saving session: {e}")
        import traceback
        print(f"Save session traceback: {traceback.format_exc()}")
        return False

def load_session(session_id):
    """Load session data from file"""
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            return json.load(f)
    return None

def generate_speech(text, output_file_path):
    """Generate speech from text using Google TTS or local TTS fallback"""
    # First try Google Cloud TTS if available
    if tts_client and using_cloud_tts:
        try:
            print("Using Google Cloud TTS...")
            # Simplify the text to make it more digestible
            text = text.replace('\n', ' ').strip()
            
            # Limit text length for more reliable processing
            if len(text) > 2000:
                text = text[:2000] + "..."
                print(f"Text was too long and was truncated to {len(text)} chars")
            
            # Set the text input to be synthesized
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Build the voice request with neutral voice
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-D",  # Standard male voice
                ssml_gender=texttospeech.SsmlVoiceGender.MALE
            )
            
            # Select the type of audio file you want returned
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.9,  # Slightly slower for better clarity
                pitch=0.0  # Default pitch
            )
            
            # Perform the text-to-speech request
            response = tts_client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            
            # Write the audio content to file
            with open(output_file_path, "wb") as out:
                out.write(response.audio_content)
                
            print(f"Google Cloud TTS audio written to file: {output_file_path}")
            return output_file_path
        except Exception as e:
            print(f"Google Cloud TTS failed: {e}")
            if local_tts:
                print("Falling back to local TTS...")
                # Call local TTS but use WAV instead of MP3
                wav_path = output_file_path.replace('.mp3', '.wav')
                try:
                    # Return the actual path from the local TTS function
                    return generate_local_tts(text, wav_path)
                except Exception as local_e:
                    print(f"Local TTS fallback also failed: {local_e}")
                    raise
            else:
                raise
    elif local_tts:
        # Use local TTS as primary option
        print("Using local TTS as primary option...")
        # Use WAV instead of MP3
        wav_path = output_file_path.replace('.mp3', '.wav')
        try:
            # Return the actual path from the local TTS function
            return generate_local_tts(text, wav_path)
        except Exception as local_e:
            print(f"Local TTS failed as primary option: {local_e}")
            raise
    else:
        print("No TTS system available")
        raise Exception("Text-to-Speech service not available")

def generate_local_tts(text, output_file_path):
    """Generate speech using local pyttsx3 TTS engine"""
    if not local_tts:
        raise Exception("Local TTS not available")
        
    try:
        print(f"Generating speech using local TTS engine")
        # Simplify the text
        text = text.replace('\n', ' ').strip()
        if len(text) > 2000:
            text = text[:2000] + "..."
            
        # Try to get available voices and set a male voice if possible
        voices = local_tts.getProperty('voices')
        for voice in voices:
            if 'male' in voice.name.lower():
                print(f"Setting male voice: {voice.name}")
                local_tts.setProperty('voice', voice.id)
                break
                
        # Configure speech rate
        local_tts.setProperty('rate', 150)  # Normal speaking rate
            
        # Save to WAV file (pyttsx3 uses WAV)
        wav_path = output_file_path
        if not wav_path.endswith('.wav'):
            wav_path = output_file_path.replace('.mp3', '.wav')
        
        # Run in blocking mode
        print(f"Saving TTS to file: {wav_path}")
        local_tts.save_to_file(text, wav_path)
        local_tts.runAndWait()
        
        print(f"Local TTS saved to: {wav_path}")
        # Return the path instead of boolean
        return wav_path
    except Exception as e:
        print(f"Local TTS failed: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise

@app.route('/get_audio/<filename>', methods=['GET'])
def get_audio(filename):
    """Serve audio files"""
    try:
        # Clean filename to prevent directory traversal
        cleaned_filename = os.path.basename(filename)
        
        # Check for both MP3 and WAV versions
        mp3_path = os.path.join(AUDIO_DIR, cleaned_filename)
        wav_path = os.path.join(AUDIO_DIR, cleaned_filename.replace('.mp3', '.wav'))
        
        # Determine which file to serve
        if os.path.exists(mp3_path):
            file_path = mp3_path
            mimetype = 'audio/mpeg'
        elif os.path.exists(wav_path):
            file_path = wav_path
            mimetype = 'audio/wav'
        else:
            print(f"Audio file not found: {mp3_path} or {wav_path}")
            return jsonify({"error": "Audio file not found"}), 404
        
        # Get the file size for content-length header
        file_size = os.path.getsize(file_path)
        print(f"Serving audio file: {file_path}, size: {file_size} bytes, type: {mimetype}")
        
        # Send file with explicit MIME type and cache control headers
        response = send_file(
            file_path, 
            mimetype=mimetype,
            as_attachment=False,
            conditional=True
        )
        
        # Add cache control headers
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Content-Length'] = str(file_size)
        
        return response
    except Exception as e:
        print(f"Error serving audio file: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/speech_to_text', methods=['POST'])
def speech_to_text():
    """Convert speech to text using Google Speech-to-Text API"""
    # This is a placeholder for the speech-to-text functionality
    # You would need to implement this using a service like Google Speech-to-Text
    # For now, we'll return an error message
    return jsonify({
        "success": False,
        "error": "Speech-to-text functionality not implemented yet",
        "text": ""
    }), 501

if __name__ == '__main__':
    app.run(debug=True, port=5001)