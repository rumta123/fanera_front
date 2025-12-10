// Footer.jsx
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-200 mt-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center p-4">
        <p>© {new Date().getFullYear()} Автосалон. Все права защищены</p>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <a href="#vk" className="hover:text-white">VK</a>
          <a href="#tg" className="hover:text-white">telegram</a>
          <a href="#wp" className="hover:text-white">whatsap</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
