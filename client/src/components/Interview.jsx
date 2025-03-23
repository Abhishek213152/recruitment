import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaMicrophone, FaPause, FaFileUpload, FaSpinner } from "react-icons/fa";

const Interview = () => {
  // State variables
  const [name, setName] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const voiceMode = true;
  const [audioElement, setAudioElement] = useState(null);

  // References
  const messagesEndRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const recognitionRef = useRef(null);

  const navigate = useNavigate();

  // API endpoint
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

  // Initialize speech recognition
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript =
          event.results[event.results.length - 1][0].transcript;
        setUserInput((prevInput) => prevInput + " " + transcript);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isListening]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size - limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit. Please upload a smaller file.");
        e.target.value = null; // Reset the input
        setResumeFile(null);
        return;
      }

      // Check file type
      const fileExtension = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();
      const validTypes = [".pdf", ".doc", ".docx", ".txt", ".rtf"];
      if (!validTypes.includes(fileExtension)) {
        alert(
          "Invalid file type. Please upload PDF, DOC, DOCX, TXT or RTF files only."
        );
        e.target.value = null; // Reset the input
        setResumeFile(null);
        return;
      }

      console.log(
        "Resume file selected:",
        file.name,
        `(${Math.round(file.size / 1024)} KB)`
      );
    } else {
      console.log("No resume file selected");
    }
    setResumeFile(file);
  };

  // Start interview
  const startInterview = async (e) => {
    e.preventDefault();
    if (!name) {
      alert("Please enter your name");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("voice_mode", "true");

      // Handle resume file upload
      if (resumeFile) {
        console.log("Adding resume file to form data:", resumeFile.name);
        // Use a specific filename rather than the original one
        formData.append(
          "resume",
          resumeFile,
          "candidate_resume" +
            resumeFile.name.substring(resumeFile.name.lastIndexOf("."))
        );
      }

      console.log("Sending request to:", `${API_URL}/start_interview`);
      console.log("Form data name:", name);
      console.log("Voice mode:", voiceMode);

      const response = await axios.post(
        `${API_URL}/start_interview`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          // Add timeout
          timeout: 60000, // 60 second timeout (increased for voice processing)
        }
      );

      if (response.data.success) {
        setSessionId(response.data.session_id);
        setMessages([
          {
            role: "assistant",
            content: response.data.message,
          },
        ]);
        setIsInterviewStarted(true);

        // If voice mode is enabled and audio URL is provided
        if (voiceMode && response.data.audio_url) {
          playServerAudio(response.data.audio_url);
        } else {
          // Fallback to browser TTS
          speakText(response.data.message);
        }
      } else {
        alert("Failed to start interview");
      }
    } catch (error) {
      console.error("Error starting interview:", error);

      // Detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code outside the 2xx range
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
      } else {
        // Something happened in setting up the request
        console.error("Error message:", error.message);
      }

      alert(
        `Error starting interview: ${
          error.message || "Unknown error"
        }. Please check console for details.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Send user response
  const sendResponse = async () => {
    if (!userInput.trim() || !sessionId) return;

    const userMessage = userInput.trim();
    setUserInput("");

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/interview_response`, {
        session_id: sessionId,
        message: userMessage,
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.data.message,
          },
        ]);

        // If voice mode is enabled and audio URL is provided
        if (voiceMode && response.data.audio_url) {
          playServerAudio(response.data.audio_url);
        } else {
          // Fallback to browser TTS
          speakText(response.data.message);
        }
      } else {
        alert("Failed to process response");
      }
    } catch (error) {
      console.error("Error sending response:", error);
      alert("Error processing your response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // End interview
  const endInterview = async () => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/end_interview`, {
        session_id: sessionId,
      });

      if (response.data.success) {
        setAssessment(response.data.assessment);
        stopSpeech();
        stopListening();
      } else {
        alert("Failed to end interview");
      }
    } catch (error) {
      console.error("Error ending interview:", error);
      alert("Error ending the interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Play server-generated audio
  const playServerAudio = (audioUrl) => {
    // Stop any current speech or audio
    stopSpeech();

    console.log("Playing server audio:", audioUrl);

    // Create audio element if it doesn't exist
    let audio = audioElement;
    if (!audio) {
      audio = new Audio();
      setAudioElement(audio);
    }

    // Set event handlers
    audio.onplay = () => {
      console.log("Audio playback started");
      setIsSpeaking(true);
    };

    audio.onended = () => {
      console.log("Audio playback completed");
      setIsSpeaking(false);
    };

    audio.onpause = () => {
      console.log("Audio playback paused");
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      console.error("Error code:", audio.error ? audio.error.code : "unknown");
      setIsSpeaking(false);
      // Fallback to browser TTS if server audio fails
      const currentMessage = messages[messages.length - 1]?.content;
      if (currentMessage) {
        console.log("Falling back to browser TTS");
        speakText(currentMessage);
      }
    };

    // Add load handling
    audio.onloadstart = () => console.log("Audio loading started");
    audio.oncanplay = () => console.log("Audio can start playing");
    audio.onloadeddata = () => console.log("Audio data loaded");

    // Set source with full URL and cachebuster to prevent caching issues
    const fullUrl = `${API_URL}${audioUrl}?t=${new Date().getTime()}`;
    console.log("Setting audio source to:", fullUrl);
    audio.src = fullUrl;

    // Load and play
    audio.load();

    // Set a small timeout to ensure loading has started
    setTimeout(() => {
      console.log("Starting audio playback");
      audio.play().catch((error) => {
        console.error("Failed to play audio:", error);
        setIsSpeaking(false);

        // Try once more after a delay
        setTimeout(() => {
          console.log("Retrying audio playback...");
          audio.play().catch((retryError) => {
            console.error("Retry also failed:", retryError);

            // Fall back to browser TTS
            const currentMessage = messages[messages.length - 1]?.content;
            if (currentMessage) {
              console.log("Falling back to browser TTS after retry failure");
              speakText(currentMessage);
            }
          });
        }, 1000);
      });
    }, 300);
  };

  // Text-to-speech functionality (browser-based fallback)
  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      // Stop any ongoing speech
      stopSpeech();

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for better clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Get voices
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // If voices aren't loaded yet, wait for them
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          setVoice(voices);
        };
      } else {
        setVoice(voices);
      }

      function setVoice(voiceList) {
        // Priority order: Indian male > Any male Indian > Any Indian > English male > Any male
        const indianMaleVoice = voiceList.find(
          (voice) =>
            voice.lang.includes("en-IN") &&
            (voice.name.includes("Male") ||
              voice.name.includes("male") ||
              voice.name.toLowerCase().includes("kumar"))
        );

        const anyIndianVoice = voiceList.find((voice) =>
          voice.lang.includes("en-IN")
        );

        const englishMaleVoice = voiceList.find(
          (voice) =>
            (voice.lang.includes("en-US") || voice.lang.includes("en-GB")) &&
            (voice.name.includes("Male") || voice.name.includes("male"))
        );

        const anyMaleVoice = voiceList.find(
          (voice) => voice.name.includes("Male") || voice.name.includes("male")
        );

        // Pick the best available voice in order of preference
        const preferredVoice =
          indianMaleVoice ||
          anyIndianVoice ||
          englishMaleVoice ||
          anyMaleVoice ||
          voiceList[0];

        if (preferredVoice) {
          console.log("Using voice:", preferredVoice.name, preferredVoice.lang);
          utterance.voice = preferredVoice;
        }

        // Set events
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        // Store reference and speak
        speechSynthesisRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const stopSpeech = () => {
    // Stop browser speech synthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Stop audio playback if it exists
    if (audioElement) {
      try {
        console.log("Stopping current audio playback");
        audioElement.pause();
        audioElement.currentTime = 0;
      } catch (e) {
        console.error("Error stopping audio:", e);
      }
    }

    setIsSpeaking(false);
  };

  // Speech recognition toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Format assessment for display
  const formatAssessment = () => {
    if (!assessment) return null;

    if (assessment.text_assessment) {
      return <p>{assessment.text_assessment}</p>;
    }

    return (
      <div className="assessment-container">
        {Object.entries(assessment).map(([key, value]) => (
          <div key={key} className="assessment-section">
            <h3>
              {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </h3>
            {typeof value === "string" ? (
              <p>{value}</p>
            ) : (
              <ul>
                {Object.entries(value).map(([subKey, subValue]) => (
                  <li key={subKey}>
                    <strong>{subKey.replace(/_/g, " ")}:</strong> {subValue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="interview-container max-w-4xl mx-auto p-4">
      {!isInterviewStarted ? (
        // Interview Setup Form
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">
            AI Technical Interview
          </h1>
          <form onSubmit={startInterview}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">
                Upload Resume (Optional)
              </label>
              <div className="border rounded-lg p-4 flex items-center justify-center">
                <label className="cursor-pointer flex flex-col items-center">
                  <FaFileUpload className="text-3xl mb-2 text-blue-500" />
                  <span className="text-sm text-gray-500">
                    {resumeFile
                      ? resumeFile.name
                      : "Click to upload PDF/DOC/TXT"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <div className="mb-6 text-sm text-gray-600 p-2 bg-blue-50 rounded">
              <p>
                <span className="font-semibold">Voice Mode Enabled:</span> Your
                interview will be conducted by our Male Indian AI Interviewer.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              disabled={isLoading}
            >
              {isLoading ? (
                <FaSpinner className="animate-spin mx-auto" />
              ) : (
                "Start Interview"
              )}
            </button>
          </form>
        </div>
      ) : (
        // Interview Chat Interface
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <h2 className="text-xl font-semibold">
              Technical Interview with AI
            </h2>
            {sessionId && (
              <p className="text-sm opacity-75">Session: {sessionId}</p>
            )}
          </div>

          {assessment ? (
            // Assessment View
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Interview Assessment</h2>
              {formatAssessment()}
              <button
                onClick={() => navigate("/")}
                className="mt-6 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
              >
                Return Home
              </button>
            </div>
          ) : (
            // Chat View
            <>
              <div className="h-96 overflow-y-auto p-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-4 flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-3/4 p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-100 text-gray-800"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-200 p-3 rounded-lg text-gray-800">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-4">
                <div className="flex">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 mr-2 rounded-full ${
                      isListening
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    title={isListening ? "Stop Listening" : "Start Listening"}
                  >
                    <FaMicrophone />
                  </button>

                  <button
                    type="button"
                    onClick={isSpeaking ? stopSpeech : null}
                    className={`p-2 mr-2 rounded-full ${
                      isSpeaking
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                    disabled={!isSpeaking}
                    title={isSpeaking ? "Stop Speaking" : "AI is not speaking"}
                  >
                    <FaPause />
                  </button>

                  <input
                    type="text"
                    className="flex-1 p-2 border rounded-l-lg"
                    placeholder="Type your answer..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        sendResponse();
                      }
                    }}
                  />

                  <button
                    onClick={sendResponse}
                    className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition"
                    disabled={!userInput.trim() || isLoading}
                  >
                    Send
                  </button>
                </div>

                <div className="flex justify-between mt-4">
                  <button
                    onClick={endInterview}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                    disabled={isLoading}
                  >
                    End Interview
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Interview;
