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
  const [isFailed, setIsFailed] = useState(false);
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
  const [allTestsRun, setAllTestsRun] = useState(false);
  const [runningTest, setRunningTest] = useState(null);
  const [syntaxError, setSyntaxError] = useState(null);
  const editorRef = useRef(null);

  // Map language names to Monaco editor language identifiers
  const languageMap = {
    java: "java",
    cpp: "cpp",
    python: "python",
  };

  useEffect(() => {
    // Check if there's a saved question in localStorage
    const savedQuestion = localStorage.getItem("currentQuestion");
    const savedCode = localStorage.getItem("currentCode");

    if (savedQuestion && savedCode) {
      setQuestion(JSON.parse(savedQuestion));
      setCode(JSON.parse(savedCode));
      setLoading(false);
    } else {
      fetchQuestion();
    }
  }, []);

  // Reset test results when changing language
  useEffect(() => {
    setTestResults([]);
    setAllTestsRun(false);
    setIsAccepted(false);
    setIsFailed(false);
    setResults(null);
  }, [language]);

  const fetchQuestion = () => {
    setLoading(true);
    setResults(null);
    setTestResults([]);
    setAllTestsRun(false);
    setIsAccepted(false);
    setIsFailed(false);

    // Add force_new=true and current_id to ensure we get a new question
    const params = new URLSearchParams({
      force_new: "true",
      current_id: question.id || "",
    });

    fetch(`http://127.0.0.1:5000/get_question?${params}`)
      .then((response) => response.json())
      .then((data) => {
        // Modify Java function signature to have LeetCode-style formatting
        if (data.function_signature && data.function_signature.java) {
          const javaSignature = data.function_signature.java;

          // Check if it's already in LeetCode format
          if (!javaSignature.includes("class Solution")) {
            // Extract the method signature
            const methodMatch = javaSignature.match(
              /(public|private|protected)?\s+([\w\s\[\]\.]+)\s*\((.*?)\)/
            );
            if (methodMatch) {
              // Create LeetCode-style format
              data.function_signature.java = `class Solution {
    ${methodMatch[0]} {
        
    }
}`;
            }
          }
        }

        // Modify C++ function signature to have LeetCode-style formatting
        if (data.function_signature && data.function_signature.cpp) {
          const cppSignature = data.function_signature.cpp;

          // Check if it's already in LeetCode format
          if (!cppSignature.includes("class Solution")) {
            // Extract the function signature - matches return type, function name and parameters
            const cppMethodMatch = cppSignature.match(
              /([\w:]+(?:\s*<.*?>)?(?:\s*\*)?)\s+(\w+)\s*\((.*?)\)/
            );
            if (cppMethodMatch) {
              // Create LeetCode-style format
              data.function_signature.cpp = `class Solution {
public:
    ${cppMethodMatch[0]} {
        
    }
};`;
            }
          }
        }

        // Modify Python function signature to have LeetCode-style formatting
        if (data.function_signature && data.function_signature.python) {
          const pythonSignature = data.function_signature.python;

          // Check if it's already in LeetCode format
          if (!pythonSignature.includes("class Solution")) {
            // Extract the function definition - matches 'def', function name and parameters
            const pythonMethodMatch = pythonSignature.match(
              /def\s+(\w+)\s*\((.*?)\)(?:\s*->\s*([\w\[\],\s]+))?:/
            );
            if (pythonMethodMatch) {
              const fullSignature = pythonSignature.split("\n")[0]; // Get the first line with the function definition

              // Create LeetCode-style format
              data.function_signature.python = `class Solution:
    ${fullSignature}
        `;
            }
          }
        }

        setQuestion(data);
        // Initialize code editor with function signatures
        const newCode = {
          java: data.function_signature?.java || "// Add your solution here",
          cpp: data.function_signature?.cpp || "// Add your solution here",
          python: data.function_signature?.python || "# Add your solution here",
        };
        setCode(newCode);

        // Save to localStorage
        localStorage.setItem("currentQuestion", JSON.stringify(data));
        localStorage.setItem("currentCode", JSON.stringify(newCode));

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

    // Define custom theme
    monaco.editor.defineTheme("customDracula", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#6272a4" },
        { token: "keyword", foreground: "#ff79c6" },
        { token: "string", foreground: "#f1fa8c" },
        { token: "number", foreground: "#bd93f9" },
        { token: "type", foreground: "#8be9fd" },
      ],
      colors: {
        "editor.background": "#282a36",
        "editor.foreground": "#f8f8f2",
        "editor.lineHighlightBackground": "#282a36",
        "editor.lineHighlightBorder": "#282a36",
        "editorCursor.foreground": "#f8f8f2",
        "editor.selectionBackground": "#44475a",
        "editor.inactiveSelectionBackground": "#44475a70",
        "editorLineNumber.foreground": "#6272a4",
        "editor.selectionHighlightBackground": "#424450",
        "editorWhitespace.foreground": "#3B3A32",
      },
    });

    // Apply the theme
    monaco.editor.setTheme("customDracula");

    // Set editor options
    editor.updateOptions({
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      fontFamily: "'Fira Code', 'Consolas', monospace",
      fontSize: 16,
      lineNumbers: "on",
      matchBrackets: "always",
      automaticLayout: true,
      tabSize: 4,
      renderWhitespace: "none", // Hide whitespace characters
      renderLineHighlight: "all",
      renderIndentGuides: true,
    });
  };

  const handleCodeChange = (value) => {
    setCode({ ...code, [language]: value });
    // Clear test results when code changes
    setTestResults([]);
    setAllTestsRun(false);
    setIsAccepted(false);
    setIsFailed(false);
    setResults(null);
    setSyntaxError(null); // Reset syntax error on code change
  };

  // Check if code is valid (not empty or just the template)
  const isCodeValid = () => {
    const currentCode = code[language];
    const isFunctionSignatureOnly =
      currentCode === question.function_signature?.[language] ||
      currentCode === `// Add your solution here` ||
      currentCode === `# Add your solution here` ||
      !currentCode.trim();

    return !isFunctionSignatureOnly;
  };

  // Check if all tests have been run and all passed
  const checkAllTestsPassed = () => {
    if (testResults.length === question.examples.length) {
      // Ensure all test results are present (not null or undefined)
      const allResultsPresent = testResults.every(
        (result) => result !== null && result !== undefined
      );

      if (allResultsPresent) {
        const allPassed = testResults.every((result) => result.passed);
        setIsAccepted(allPassed);
        setIsFailed(!allPassed);
        setAllTestsRun(true);
      }
    } else {
      setAllTestsRun(false);
    }
  };

  // Standardize test result format between individual tests and submission
  const formatTestResult = (data, index) => {
    return {
      passed: data.passed,
      actual_output: data.actual_output || "No output",
      explanation: data.passed ? "" : data.explanation || "Test failed",
      test_number: index + 1,
      input: question.examples[index].input,
      expected_output: question.examples[index].output,
    };
  };

  const runTestCase = (index) => {
    // Check if code is valid before running test
    if (!isCodeValid()) {
      const invalidResult = {
        passed: false,
        actual_output: "No valid code",
        explanation: "Please add your solution before running the test.",
        test_number: index + 1,
        input: question.examples[index].input,
        expected_output: question.examples[index].output,
      };

      const newTestResults = [...testResults];
      newTestResults[index] = invalidResult;
      setTestResults(newTestResults);
      setIsFailed(true);
      return Promise.resolve(invalidResult);
    }

    const testCase = question.examples[index];
    setRunningTest(index);

    return fetch("http://127.0.0.1:5000/run_test_case", {
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
        // Check for syntax or compilation errors
        if (
          (data.error && data.error.includes("syntax")) ||
          (data.error && data.error.includes("compilation"))
        ) {
          setSyntaxError(data.error);
        } else {
          setSyntaxError(null);
        }

        // Format the result
        const result = formatTestResult(data, index);

        // Update the test results state
        const newTestResults = [...testResults];
        newTestResults[index] = result;
        setTestResults(newTestResults);
        setRunningTest(null);

        // Check if all tests are passed after each test run
        if (
          newTestResults.filter((r) => r !== null && r !== undefined).length ===
          question.examples.length
        ) {
          setTimeout(() => checkAllTestsPassed(), 100);
        }

        return data;
      })
      .catch((error) => {
        console.error("Error running test case:", error);
        setRunningTest(null);

        // Create an error result
        const errorResult = {
          passed: false,
          actual_output: "Error",
          explanation: "Failed to run test case. Please try again.",
          test_number: index + 1,
          input: testCase.input,
          expected_output: testCase.output,
        };

        // Store the error with the test index
        const newTestResults = [...testResults];
        newTestResults[index] = errorResult;
        setTestResults(newTestResults);
        setIsFailed(true);

        return errorResult; // Return the error result instead of throwing
      });
  };

  const handleSubmit = () => {
    // Check if code is valid before submission
    if (!isCodeValid()) {
      setResults({
        success: false,
        error: "Please add your solution before submitting.",
        test_results: question.examples.map((example, index) => ({
          passed: false,
          actual_output: "No valid code",
          explanation: "No valid solution provided",
          test_number: index + 1,
          input: example.input,
          expected_output: example.output,
        })),
        passed_tests: 0,
        total_tests: question.examples.length,
      });
      setIsFailed(true);
      return;
    }

    // Check if all test cases have been run individually
    const allTestsAttempted =
      testResults.length === question.examples.length &&
      testResults.every((result) => result !== null && result !== undefined);

    if (!allTestsAttempted) {
      // Show message asking user to run all test cases individually first
      setResults({
        success: false,
        error: "Please run all test cases individually before submitting.",
        test_results: [],
        passed_tests: 0,
        total_tests: question.examples.length,
      });
      setIsFailed(true);
      return;
    }

    setSubmitting(true);
    setResults(null);

    // All tests have already been run individually, use the existing results
    const validResults = testResults.filter(
      (result) => result !== null && result !== undefined
    );
    const passedTests = validResults.filter((result) => result.passed).length;

    setSubmitting(false);
    setResults({
      success: passedTests === question.examples.length,
      test_results: testResults,
      passed_tests: passedTests,
      total_tests: question.examples.length,
      execution_time: "N/A",
      memory_usage: "N/A",
    });
    setIsAccepted(passedTests === question.examples.length);
    setIsFailed(passedTests !== question.examples.length);
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
            marginBottom: "15px",
          }}
        >
          <h1
            style={{ color: "#f8f8f2", fontSize: "24px", fontWeight: "bold" }}
          >
            📌 Coding Question
          </h1>
          <button
            onClick={fetchQuestion}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#6272a4" : "#50fa7b",
              color: "#282a36",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              transition: "background-color 0.3s ease",
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
              Examples:
            </h2>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#f8f8f2" }}>
                Run tests individually before submitting:
              </span>
            </div>
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
                    <strong>Input:</strong>{" "}
                    {example.input
                      .replace(/`/g, "")
                      .replace(/nums = /g, "")
                      .replace(/'/g, "")}
                    <br />
                    <strong>Output:</strong>{" "}
                    {example.output.replace(/`/g, "").replace(/'/g, "")}
                    {example.explanation && (
                      <>
                        <br />
                        <strong>Explanation:</strong>{" "}
                        {example.explanation
                          .replace(/`/g, "")
                          .replace(/'/g, "")}
                      </>
                    )}
                  </div>

                  {/* Display test case result */}
                  {testResults[index] &&
                    (testResults[index].explanation ||
                      testResults[index].error) && (
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
                            {testResults[index].explanation ||
                              testResults[index].error}
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
                  Constraints:
                </h2>
                <ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
                  {question.constraints.map((constraint, index) => (
                    <li
                      key={index}
                      style={{ fontSize: "14px", marginBottom: "5px" }}
                    >
                      {constraint.replace(/`/g, "")}
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
            border: "none",
            borderRadius: "4px",
            overflow: "hidden",
            backgroundColor: "#282a36", // Match the editor theme background
            boxShadow: "none", // Remove any default shadow that might cause blur
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
              fontSize: 16,
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
            theme="customDracula"
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
        ) : isFailed ? (
          <button
            onClick={handleSubmit}
            disabled={loading || submitting}
            style={{
              marginTop: "10px",
              backgroundColor: "#ff5555",
              color: "#f8f8f2",
              border: "none",
              padding: "10px 15px",
              borderRadius: "4px",
              cursor: loading || submitting ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#bd93f9";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#ff5555";
            }}
          >
            ⟳ Re-submit
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

            {results.error && (
              <div style={{ color: "#ff5555", marginBottom: "15px" }}>
                <p>{results.error}</p>
              </div>
            )}

            {results.test_results && results.test_results.length > 0 ? (
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
                        style={{ color: test.passed ? "#50fa7b " : "#ff5555" }}
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
            ) : results.error &&
              results.error.includes("run all test cases") ? (
              <div style={{ textAlign: "center", padding: "10px" }}>
                <p>
                  Please run each test case individually by clicking the "Run
                  Test" button next to each example.
                </p>
                <p
                  style={{
                    marginTop: "10px",
                    fontSize: "14px",
                    color: "#ff79c6",
                  }}
                >
                  Once all tests are run, you can submit your solution.
                </p>
              </div>
            ) : null}

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