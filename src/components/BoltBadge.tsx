import React from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const BoltBadge: React.FC = () => {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <a
        href="https://bolt.new"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-medium"
      >
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"></div>
          </div>
          <span>Built with Bolt.new</span>
          <ExternalLink 
            size={14} 
            className="opacity-70 group-hover:opacity-100 transition-opacity duration-200" 
          />
        </div>
      </a>
    </motion.div>
  );
};

export default BoltBadge;