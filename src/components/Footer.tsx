import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full text-white/70 text-xs sm:text-sm" style={{ backgroundColor: '#819077' }}>
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center py-3 sm:py-4 px-4 sm:px-6 md:px-12 lg:px-24 space-y-2 sm:space-y-0">
        {/* Copyright */}
        <p className="text-center sm:text-left">© {new Date().getFullYear()} SunSip. All rights reserved.</p>
        
        {/* About and GitHub links */}
        <div className="flex space-x-4 sm:space-x-6">
          <a href="/about" className="hover:text-white transition-colors">About</a>
          <a href="https://github.com/pocpat/sunsip" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
        
        {/* Empty space for the badge on larger screens */}
        <div className="hidden sm:block w-32"></div>
      </div>
    </footer>
  );
};

export default Footer;