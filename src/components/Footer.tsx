import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full text-white/70 text-sm" style={{ backgroundColor: '#819077' }}>
      <div className="container mx-auto flex justify-between items-center py-4 px-6 md:px-12 lg:px-24">
        <p>© {new Date().getFullYear()} SunSip. All rights reserved.</p>
        <div className="flex space-x-4">
          <a href="/about" className="hover:text-white transition-colors">About</a>
          <a href="https://github.com/pocpat/sunsip" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;