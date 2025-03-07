import React, { useState } from "react";
import axios from "axios";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const Upload = () => {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [missingKeywords, setMissingKeywords] = useState(null);
  const [improvement_tips, setImprovement_tips] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResumeChange = (e) => {
    setResume(e.target.files[0]);
  };

  const handleJobDescriptionChange = (e) => {
    setJobDescription(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resume || !jobDescription) {
      setError("Please upload a resume and enter a job description.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("job_description", jobDescription);

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/process_resume",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setAtsScore(response.data.match_score);
      setMissingKeywords(response.data.missing_keywords);
      setImprovement_tips(response.data.improvement_tips);
    } catch (err) {
      setError("Error processing resume. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (atsScore !== null) {
    return (
      <div className="flex flex-col items-center justify-center w-full p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md text-center">
          <h3 className="text-2xl font-bold text-gray-800">ATS Match Score</h3>
          <div className="w-40 h-40 mx-auto mt-4">
            <CircularProgressbar
              value={atsScore}
              text={`${atsScore}%`}
              styles={buildStyles({
                textColor: "#4f46e5",
                pathColor: "#4f46e5",
                trailColor: "#d1d5db",
                textSize: "20px",
              })}
            />
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-semibold text-gray-700">
              Missing Keywords:
            </h4>
            <p className="text-gray-600 bg-gray-100 p-2 rounded-md">
              {missingKeywords || "None"}
            </p>
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-semibold text-gray-700">
              Improvement Tips:
            </h4>
            <p className="text-gray-600 bg-gray-100 p-2 rounded-md">
              {improvement_tips || "No specific tips."}
            </p>
          </div>
          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            onClick={() => window.location.reload()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full p-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {resume ? (
              <p className="text-xl font-semibold text-blue-600">
                {resume.name}
              </p>
            ) : (
              <>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-gray-500">PDF or DOC files only</p>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeChange}
          />
        </label>
      </div>
      <textarea
        type="text"
        placeholder="Job description"
        className="mt-4 w-full p-2 h-20 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={jobDescription}
        onChange={handleJobDescriptionChange}
      />
      <button
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        onClick={handleSubmit}
      >
        Get your Score
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default Upload;