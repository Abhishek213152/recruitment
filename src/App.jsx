import { Routes, Route } from "react-router-dom";
import React from "react";
import Home from "./components/Home";
import Ats from "./Ats";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ats" element={<Ats />} />
      </Routes>
    </div>
  );
};

export default App;