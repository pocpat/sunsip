import React from 'react';
import * as Sentry from "@sentry/react";

const SentryTestButton: React.FC = () => {
  const handleTestError = () => {
    try {
      throw new Error("This is your first Sentry error!");
    } catch (error) {
      Sentry.captureException(error);
      console.log("Sentry test error captured successfully");
    }
  };

  const handleTestCaptureException = () => {
    try {
      throw new Error("This is a captured exception for testing");
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const handleTestCaptureMessage = () => {
    Sentry.captureMessage("This is a test message from SunSip", "info");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Sentry Debug Tools</h3>
        <div className="space-y-2">
          <button 
            onClick={handleTestError}
            className="w-full text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
          >
            Test Error (Captured)
          </button>
          <button 
            onClick={handleTestCaptureException}
            className="w-full text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors"
          >
            Test Captured Exception
          </button>
          <button 
            onClick={handleTestCaptureMessage}
            className="w-full text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
          >
            Test Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default SentryTestButton;