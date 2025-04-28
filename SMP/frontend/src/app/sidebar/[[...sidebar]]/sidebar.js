"use client"; // ✅ Sidebar must be a Client Component

import { useState } from "react";
import { FaBars, FaTimes, FaHome, FaClipboardList, FaUser, FaCog } from "react-icons/fa";
import Link from "next/link";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`h-screen bg-gradient-to-b from-blue-600 to-red-500 ${isOpen ? "w-64" : "w-16"} transition-all duration-300 fixed`}>
      <div className="flex items-center justify-between p-4">
        <h2 className={`text-white text-xl font-bold ${!isOpen && "hidden"}`}>BrandLogo</h2>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white">
          {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      <nav className="mt-5 space-y-2">
        <Link href="/dashboard" className="flex items-center p-3 text-white hover:bg-blue-700">
          <FaHome className="mr-3" /> {isOpen && "Dashboard"}
        </Link>
        <Link href="/jobs" className="flex items-center p-3 text-white hover:bg-blue-700">
          <FaClipboardList className="mr-3" /> {isOpen && "Jobs"}
        </Link>
        <Link href="/profile" className="flex items-center p-3 text-white hover:bg-blue-700">
          <FaUser className="mr-3" /> {isOpen && "Profile"}
        </Link>
        <Link href="/settings" className="flex items-center p-3 text-white hover:bg-blue-700">
          <FaCog className="mr-3" /> {isOpen && "Settings"}
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;
