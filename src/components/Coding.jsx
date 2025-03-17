import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";

// Register languages for syntax highlighting
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("python", python);

const Coding = () => {
  const [isAccepted, setIsAccepted] = useState(false);
  const [code, setCode] = useState({
    java: "",
    cpp: "",
    python: "",
  });
  const [language, setLanguage] = useState("java");
  const [question, setQuestion] = useState({
    id: 0,
    title: "Loading...",
    difficulty: "",
    description: "Loading question...",
    examples: [],
    constraints: [],
    function_signature: {
      java: "",
      cpp: "",
      python: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [runningTest, setRunningTest] = useState(null);
  const editorRef = useRef(null);

  // Map language names to Monaco editor language identifiers
  const languageMap = {
    java: "java",
    cpp: "cpp",
    python: "python",
  };

  useEffect(() => {
    fetchQuestion();
  }, []);

  // Reset test results when changing language
  useEffect(() => {
    setTestResults([]);
  }, [language]);

  const fetchQuestion = () => {
    setLoading(true);
    setResults(null);
    setTestResults([]);
    setIsAccepted(false); // Reset the accepted state

    fetch("http://127.0.0.1:5000/get_question")
      .then((response) => response.json())
      .then((data) => {
        setQuestion(data);
        // Initialize code editor with function signatures
        setCode({
          java: data.function_signature?.java || "// Add your solution here",
          cpp: data.function_signature?.cpp || "// Add your solution here",
          python: data.function_signature?.python || "# Add your solution here",
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching question:", error);
        setLoading(false);
      });
  };

  // Function to handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Set editor options
    editor.updateOptions({
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      fontFamily: "'Fira Code', 'Consolas', monospace",
      fontSize: 14,
      lineNumbers: "on",
      matchBrackets: "always",
      automaticLayout: true,
      tabSize: 4,
    });

    // Add auto bracket closing
    monaco.editor.defineTheme("customDracula", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#282a36",
        "editor.foreground": "#f8f8f2",
        "editor.lineHighlightBackground": "#44475a",
        "editorCursor.foreground": "#f8f8f2",
        "editor.selectionBackground": "#44475a",
        "editor.inactiveSelectionBackground": "#44475a70",
      },
    });

    monaco.editor.setTheme("customDracula");
  };

  const handleCodeChange = (value) => {
    setCode({ ...code, [language]: value });
    // Clear test results when code changes
    setTestResults([]);
  };

  const runTestCase = (index) => {
    const testCase = question.examples[index];
    setRunningTest(index);

    fetch("http://127.0.0.1:5000/run_test_case", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: language,
        code: code[language],
        test_case: testCase,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Store the result with the test index
        const newTestResults = [...testResults];
        newTestResults[index] = data;
        setTestResults(newTestResults);
        setRunningTest(null);
      })
      .catch((error) => {
        console.error("Error running test case:", error);
        setRunningTest(null);

        // Store the error with the test index
        const newTestResults = [...testResults];
        newTestResults[index] = {
          passed: false,
          error: "Failed to run test case. Please try again.",
        };
        setTestResults(newTestResults);
      });
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setResults(null);

    fetch("http://127.0.0.1:5000/submit_solution", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_description: question.description,
        examples: question.examples,
        language: language,
        code: code[language],
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setResults(data);
        setSubmitting(false);

        // Set isAccepted to true if all tests passed
        if (data.success === true) {
          setIsAccepted(true);
        }
      })
      .catch((error) => {
        console.error("Error submitting code:", error);
        setSubmitting(false);
        setResults({
          success: false,
          error: "Failed to submit solution. Please try again.",
        });
      });
  };

  // Helper function to convert difficulty to color
  const difficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "#5cb85c"; // green
      case "medium":
        return "#f0ad4e"; // yellow
      case "hard":
        return "#d9534f"; // red
      default:
        return "#6272a4";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        padding: "10px",
        gap: "10px",
        backgroundColor: "#1e1e2e",
        color: "#ffffff",
        flexDirection: window.innerWidth < 768 ? "column" : "row", // Responsive layout
      }}
    >
      {/* Question Box */}
      <div
        style={{
          width: window.innerWidth < 768 ? "100%" : "40%",
          background: "#282a36",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
          overflowY: "auto",
          maxHeight: window.innerWidth < 768 ? "40vh" : "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{ color: "#f8f8f2", fontSize: "24px", fontWeight: "bold" }}
          >
            📌 Coding Question
          </h1>
          <button
            onClick={fetchQuestion}
            style={{
              backgroundColor: "#bd93f9",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {loading ? "Loading..." : "New Question"}
          </button>
        </div>

        <hr style={{ borderColor: "#6272a4" }} />

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Loading question...</p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ color: "#ff79c6", fontSize: "20px" }}>
                {question.title}
              </h2>
              <span
                style={{
                  backgroundColor: difficultyColor(question.difficulty),
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {question.difficulty}
              </span>
            </div>

            <p
              style={{
                fontSize: "16px",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
              }}
            >
              {question.description}
            </p>

            {/* Display Examples with Run Test buttons */}
            <h2
              style={{ color: "#8be9fd", fontSize: "18px", marginTop: "15px" }}
            >
              🔹 Examples:
            </h2>
            {question.examples &&
              question.examples.map((example, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.6",
                    marginBottom: "15px",
                    backgroundColor: "#353746",
                    padding: "10px",
                    borderRadius: "5px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "5px",
                    }}
                  >
                    <strong>Example {index + 1}:</strong>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {testResults[index] && (
                        <span
                          style={{
                            color: testResults[index].passed
                              ? "#50fa7b"
                              : "#ff5555",
                            fontSize: "18px",
                          }}
                        >
                          {testResults[index].passed ? "✅" : "❌"}
                        </span>
                      )}
                      <button
                        onClick={() => runTestCase(index)}
                        disabled={loading || runningTest !== null}
                        style={{
                          backgroundColor:
                            runningTest === index ? "#6272a4" : "#8be9fd",
                          color: "#282a36",
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor:
                            loading || runningTest !== null
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {runningTest === index ? "Running..." : "Run Test"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <strong>Input:</strong> {example.input} <br />
                    <strong>Output:</strong> {example.output}
                    {example.explanation && (
                      <>
                        <br />
                        <strong>Explanation:</strong> {example.explanation}
                      </>
                    )}
                  </div>

                  {/* Display test case result */}
                  {testResults[index] && testResults[index].explanation && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px",
                        backgroundColor: testResults[index].passed
                          ? "rgba(80, 250, 123, 0.1)"
                          : "rgba(255, 85, 85, 0.1)",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <strong>Your Output:</strong>{" "}
                        {testResults[index].actual_output}
                      </div>
                      {!testResults[index].passed && (
                        <div>
                          <strong>Why it failed:</strong>{" "}
                          {testResults[index].explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

            {/* Display Constraints */}
            {question.constraints && question.constraints.length > 0 && (
              <>
                <h2
                  style={{
                    color: "#8be9fd",
                    fontSize: "18px",
                    marginTop: "15px",
                  }}
                >
                  🔹 Constraints:
                </h2>
                <ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
                  {question.constraints.map((constraint, index) => (
                    <li
                      key={index}
                      style={{ fontSize: "14px", marginBottom: "5px" }}
                    >
                      {constraint}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {/* Coding Box */}
      <div
        style={{
          width: window.innerWidth < 768 ? "100%" : "60%",
          background: "#44475a",
          padding: "20px",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Language Buttons */}
        <div>
          {["java", "cpp", "python"].map((lang) => (
            <button
              key={lang}
              style={{
                marginRight: "5px",
                backgroundColor: language === lang ? "#50fa7b" : "#6272a4",
                color: language === lang ? "#282a36" : "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onClick={() => setLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Monaco Code Editor */}
        <div
          style={{
            marginTop: "10px",
            height: "calc(100vh - 300px)",
            border: "1px solid #6272a4",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <Editor
            height="100%"
            language={languageMap[language]}
            value={code[language]}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              scrollBeyondLastLine: false,
              minimap: { enabled: true },
              fontFamily: "'Fira Code', 'Consolas', monospace",
              fontSize: 14,
              lineNumbers: "on",
              matchBrackets: "always",
              automaticLayout: true,
              tabSize: 4,
              formatOnType: true,
              formatOnPaste: true,
              bracketPairColorization: {
                enabled: true,
              },
              suggest: {
                showMethods: true,
                showFunctions: true,
                showConstructors: true,
                showFields: true,
                showVariables: true,
                showClasses: true,
                showStructs: true,
                showInterfaces: true,
                showEnums: true,
                showEnumMembers: true,
              },
            }}
          />
        </div>

        {/* Test Feedback Overview */}
        {testResults.length > 0 && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#282a36",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span>Test Cases: </span>
              {question.examples.map((_, index) => (
                <span
                  key={index}
                  style={{
                    marginRight: "10px",
                    color: testResults[index]
                      ? testResults[index].passed
                        ? "#50fa7b"
                        : "#ff5555"
                      : "#6272a4",
                    fontWeight: "bold",
                  }}
                >
                  {testResults[index]
                    ? testResults[index].passed
                      ? "✅"
                      : "❌"
                    : "•"}
                </span>
              ))}
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>
                {testResults.filter((result) => result && result.passed).length}
                /{testResults.filter((result) => result).length} passed
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {isAccepted ? (
          <button
            style={{
              marginTop: "10px",
              backgroundColor: "#50fa7b",
              color: "#282a36",
              border: "none",
              padding: "10px 15px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✨ Accepted ✨
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || submitting}
            style={{
              marginTop: "10px",
              backgroundColor: loading || submitting ? "#6272a4" : "#50fa7b",
              color: loading || submitting ? "#f8f8f2" : "#282a36",
              border: "none",
              padding: "10px 15px",
              borderRadius: "4px",
              cursor: loading || submitting ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {submitting ? "Evaluating..." : "🚀 Submit Solution"}
          </button>
        )}

        {/* Results Section */}
        {results && (
          <div
            style={{
              marginTop: "15px",
              backgroundColor: "#282a36",
              padding: "15px",
              borderRadius: "8px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                color: results.success ? "#50fa7b" : "#ff5555",
                marginTop: 0,
                marginBottom: "10px",
              }}
            >
              {results.success
                ? "✅ All Tests Passed!"
                : "❌ Some Tests Failed"}
            </h3>

            {results.test_results && (
              <div>
                <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                  Passed {results.passed_tests} of {results.total_tests} tests
                </p>

                {results.test_results.map((test, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: test.passed ? "#2d4e39" : "#4e2d2d",
                      padding: "10px",
                      borderRadius: "5px",
                      marginBottom: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Test {test.test_number}</span>
                      <span
                        style={{ color: test.passed ? "#50fa7b" : "#ff5555" }}
                      >
                        {test.passed ? "Passed ✓" : "Failed ✗"}
                      </span>
                    </div>
                    {!test.passed && (
                      <div style={{ marginTop: "5px" }}>
                        <div>
                          <strong>Input:</strong> {test.input}
                        </div>
                        <div>
                          <strong>Expected:</strong> {test.expected_output}
                        </div>
                        <div>
                          <strong>Your Output:</strong> {test.actual_output}
                        </div>
                        {test.explanation && (
                          <div>
                            <strong>Error:</strong> {test.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {results.error && (
              <div style={{ color: "#ff5555" }}>
                <p>{results.error}</p>
              </div>
            )}

            {results.execution_time && (
              <div style={{ marginTop: "10px", fontSize: "14px" }}>
                <p>
                  <strong>Execution Time:</strong> {results.execution_time} ms
                </p>
                <p>
                  <strong>Memory Usage:</strong> {results.memory_usage} MB
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Coding;