// Test script for client-side API calls
import axios from "axios";
import { FormData } from "formdata-node";

// API endpoint
const API_URL = "http://localhost:5001";

// Test the start_interview endpoint
async function testStartInterview() {
  console.log("Testing start_interview endpoint from client...");

  try {
    // Create form data
    const formData = new FormData();
    formData.append("name", "Test Candidate");

    // Make the request
    console.log("Sending request...");
    const response = await axios.post(`${API_URL}/start_interview`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Response status:", response.status);
    console.log("Response data:", response.data);

    return response.data;
  } catch (error) {
    console.error("Error details:");
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error message:", error.message);
    }
    console.error("Error config:", error.config);

    throw error;
  }
}

// Run the test
testStartInterview()
  .then((data) => {
    console.log("Test completed successfully!");
  })
  .catch((error) => {
    console.error("Test failed!");
  });
