import React, { useState } from "react";
import axios from "axios";

const Ats = () => {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [missingKeywords, setMissingKeywords] = useState(null);
  const [error, setError] = useState("");

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
      setError("");
    } catch (err) {
      setError("Error processing resume. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-3xl font-semibold text-center text-gray-700 mb-6">
        ATS Resume Analyzer
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Resume Upload */}
        <div className="flex flex-col">
          <label className="text-lg font-medium text-gray-700">
            Upload Resume (PDF/DOCX):{" "}
          </label>
          <input
            type="file"
            onChange={handleResumeChange}
            className="mt-2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Job Description */}
        <div className="flex flex-col">
          <label className="text-lg font-medium text-gray-700">
            Job Description:{" "}
          </label>
          <textarea
            value={jobDescription}
            onChange={handleJobDescriptionChange}
            rows="6"
            className="mt-2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Analyze
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && <p className="text-center text-red-500 mt-4">{error}</p>}

      {/* ATS Result */}
      {atsScore !== null && (
        <div className="mt-6 text-center">
          <h3 className="text-2xl font-medium text-gray-800">
            ATS Match Score:{" "}
            <span className="font-bold text-indigo-600">{atsScore}%</span>
          </h3>
          <h4 className="text-lg text-gray-600 mt-2">
            Missing Keywords:{" "}
            <span className="text-indigo-500">{missingKeywords}</span>
          </h4>
        </div>
      )}
    </div>
  );
};

export default Ats;