import { Routes, Route } from "react-router-dom";
import React from "react";
import Home from "./components/Home";
import Sidebar from "./components/Sidebar";
import Coding from "./components/Coding";
import Interview from "./components/Interview";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/a" element={<Sidebar />} />
        <Route path="/coding" element={<Coding />} />
        <Route path="/interview" element={<Interview />} />
      </Routes>
    </div>
  );
};

export default App;