import React from "react";
import Upload from "./Upload";

const Sidebar = () => {
  return (
    <div className="flex h-screen w-screen overflow-auto">
      <aside className="w-64 bg-gray-800 text-white fixed h-full p-4 overflow-y-auto">
        <h2 className="text-xl font-bold">Krek-It</h2>
        <ul className="mt-4 space-y-2">
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">
            ATS Score
          </li>
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">
            Mock Test
          </li>
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">
            Practise Coding
          </li>
        </ul>
      </aside>
      <div className="flex-1 ml-64 h-screen overflow-auto">
        <header className="bg-gray-900 text-white p-4 fixed w-full top-0 left-64">
          <h1 className="text-lg font-bold">Upload</h1>
        </header>
        <main className="p-6 mt-16 overflow-auto">
          <Upload />
        </main>
      </div>
    </div>
  );
};

export default Sidebar;