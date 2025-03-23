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
  console.log("Using API URL:", API_URL); // Add logging to verify API URL

  // Auto-start listening when the interview begins and after AI speaks
  useEffect(() => {
    // This ensures the microphone activates at the beginning and after each AI response
    if (
      isInterviewStarted &&
      !isListening &&
      !isSpeaking &&
      messages.length > 0
    ) {
      console.log("Auto-starting speech recognition after AI message");
      // Small delay to ensure the UI has updated and the AI has finished speaking
      const timer = setTimeout(() => {
        if (!isSpeaking && recognitionRef.current) {
          startListening();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isInterviewStarted, isListening, isSpeaking, messages]);

  // Initialize speech recognition with simpler implementation
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Use single recognition mode
      recognitionRef.current.interimResults = false; // Only get final results
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript =
          event.results[event.results.length - 1][0].transcript;
        setUserInput(transcript);
        console.log("Speech recognized:", transcript);
      };

      recognitionRef.current.onstart = () => {
        console.log("Recognition started");
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        console.log("Recognition ended - restarting");
        setIsListening(false);

        // Restart speech recognition if interview is ongoing and not speaking
        if (isInterviewStarted && !isSpeaking) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              console.log("Auto-restarted speech recognition");
            } catch (e) {
              console.error("Failed to restart speech recognition:", e);
            }
          }, 300);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        // Restart after error (except aborted)
        if (event.error !== "aborted" && isInterviewStarted && !isSpeaking) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              console.log("Restarted speech recognition after error");
            } catch (e) {
              console.error(
                "Failed to restart speech recognition after error:",
                e
              );
            }
          }, 300);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isInterviewStarted, isSpeaking]);

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

    // Check if browser supports speech recognition
    if (
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      alert(
        "Your browser doesn't support speech recognition. Please use Chrome, Edge or Safari."
      );
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

  // Simple playServerAudio function
  const playServerAudio = (audioUrl) => {
    stopSpeech();

    // Debug log the audio URL
    console.log("Received audio URL:", audioUrl);

    // Stop listening while audio plays
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    let audio = audioElement;
    if (!audio) {
      audio = new Audio();
      setAudioElement(audio);
    }

    // Add more events for better debugging
    audio.onloadstart = () => console.log("Audio loading started");
    audio.onloadeddata = () => console.log("Audio data loaded");
    audio.oncanplay = () => console.log("Audio can now play");

    audio.onplay = () => {
      console.log("Audio started playing");
      setIsSpeaking(true);
    };

    audio.onended = () => {
      console.log("Audio playback completed");
      setIsSpeaking(false);
      // Restart listening after audio ends
      setTimeout(() => {
        if (isInterviewStarted && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log("Restarted listening after audio ended");
          } catch (e) {
            console.error("Failed to restart listening after audio ended:", e);
          }
        }
      }, 500);
    };

    audio.onerror = (e) => {
      console.error("Audio error:", e);
      console.error(
        "Audio error code:",
        audio.error ? audio.error.code : "unknown"
      );
      console.error(
        "Audio error message:",
        audio.error ? audio.error.message : "unknown"
      );
      setIsSpeaking(false);
      const currentMessage = messages[messages.length - 1]?.content;
      if (currentMessage) {
        console.log("Falling back to browser TTS due to audio error");
        speakText(currentMessage);
      }
    };

    // Full URL with cachebuster to prevent caching issues
    const fullUrl = `${API_URL}${audioUrl}?t=${new Date().getTime()}`;
    console.log("Playing audio from URL:", fullUrl);

    // Set source and trigger load before playing
    audio.src = fullUrl;
    audio.load();

    // Play with retry with a slightly longer delay
    setTimeout(() => {
      console.log("Attempting to play audio...");
      audio.play().catch((error) => {
        console.error("Failed to play audio:", error);
        // Try again after a delay
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
    }, 500); // Increased delay for better reliability
  };

  // Text-to-speech functionality (browser-based fallback)
  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      // Stop any ongoing speech
      stopSpeech();

      // Stop listening while AI speaks
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

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
        // Just use any available voice
        const preferredVoice = voiceList[0];

        if (preferredVoice) {
          console.log("Using voice:", preferredVoice.name, preferredVoice.lang);
          utterance.voice = preferredVoice;
        }

        // Set events
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          // Restart listening after speech ends
          setTimeout(() => {
            if (isInterviewStarted && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log("Restarted speech recognition after TTS ended");
              } catch (e) {
                console.error(
                  "Failed to restart listening after TTS ended:",
                  e
                );
              }
            }
          }, 500);
        };
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

  // Simple speech functions
  const startListening = () => {
    if (!recognitionRef.current) return;

    // Clear the input when starting to listen
    setUserInput("");

    try {
      recognitionRef.current.start();
      console.log("Manually started speech recognition");
    } catch (e) {
      console.error("Error starting recognition:", e);
      // If already started, stop and restart
      if (e.message && e.message.includes("already started")) {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            recognitionRef.current.start();
          }, 100);
        } catch (innerError) {
          console.error("Failed to restart recognition:", innerError);
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("Manually stopped speech recognition");
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
  };

  // Speech recognition toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      console.log("Toggling speech recognition OFF");
      stopListening();
    } else {
      console.log("Toggling speech recognition ON");
      startListening();
    }
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
              Technical Interview with Male Indian AI
            </h2>
            {sessionId && (
              <p className="text-sm opacity-75">
                Voice-based Interview Session: {sessionId}
              </p>
            )}
          </div>

          {messages.length === 1 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This is a voice-based interview. Please speak your answers
                    into your microphone when the interviewer asks a question.
                    Your speech will be converted to text automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                      {msg.role === "assistant" &&
                        index === messages.length - 1 &&
                        isSpeaking && (
                          <div className="flex mt-2 justify-end">
                            <div className="flex space-x-1 items-center">
                              <span className="text-xs text-gray-500 mr-1">
                                Speaking
                              </span>
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                              <div
                                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"
                                style={{ animationDelay: "0.4s" }}
                              ></div>
                            </div>
                          </div>
                        )}
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
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-3 mr-3 rounded-full flex items-center justify-center ${
                      isListening
                        ? "bg-red-500 text-white shadow-lg animate-pulse"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    style={{ minWidth: "50px", height: "50px" }}
                    title={isListening ? "Stop Listening" : "Start Listening"}
                  >
                    <FaMicrophone size={24} />
                  </button>

                  <button
                    type="button"
                    onClick={isSpeaking ? stopSpeech : null}
                    className={`p-2 mr-3 rounded-full ${
                      isSpeaking
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                    disabled={!isSpeaking}
                    title={isSpeaking ? "Stop Speaking" : "AI is not speaking"}
                  >
                    <FaPause />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="w-full p-3 border rounded-l-lg"
                      placeholder="Press microphone to speak or type here"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          sendResponse();
                        }
                      }}
                    />
                  </div>

                  <button
                    onClick={sendResponse}
                    className="bg-blue-600 text-white px-4 py-3 rounded-r-lg hover:bg-blue-700 transition"
                    disabled={!userInput.trim() || isLoading}
                  >
                    Send
                  </button>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    {isListening ? (
                      <span className="text-green-600 font-medium flex items-center">
                        <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                        Listening... Speak clearly into your microphone.
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">
                        Microphone inactive. Click the microphone icon to enable
                        voice input.
                      </span>
                    )}
                  </div>
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
