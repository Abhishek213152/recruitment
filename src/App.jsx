import { Routes, Route } from "react-router-dom";
import React from "react";
import Home from "./components/Home";
import Sidebar from "./components/Sidebar";
import Coding from "./components/Coding";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/a" element={<Sidebar />} />
        <Route path="/coding" element={<Coding />} />
      </Routes>
    </div>
  );
};

export default App;