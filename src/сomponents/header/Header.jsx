// Header.jsx
import React from "react";

const Header = () => {
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center p-4">
        <div className="text-xl font-bold">Автосалон</div>
        <nav className="space-x-4">
          {/* <a href="#home" className="hover:text-gray-200">Home</a> */}
          {/* <a href="#about" className="hover:text-gray-200">About</a>
          <a href="#services" className="hover:text-gray-200">Services</a> */}
          <a href="#contact" className="hover:text-gray-200">Контакты</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
