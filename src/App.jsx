import { Routes, Route } from "react-router-dom";
import React from "react";
import Home from "./components/Home";
import Sidebar from "./components/Sidebar";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/a" element={<Sidebar />} />
      </Routes>
    </div>
  );
};

export default App;