import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { getLandmarkSuggestion } from '../textGenerationService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Sentry functions
vi.mock('../../lib/sentry', () => ({
  captureError: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe('textGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock setTimeout for sleep function
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('getLandmarkSuggestion', () => {
    it('should return null when no API key is provided', async () => {
      import.meta.env.VITE_OPENROUTER_API_KEY = undefined;

      const result = await getLandmarkSuggestion('Paris', 'France');

      expect(result).toBeNull();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return null when API key is placeholder', async () => {
      import.meta.env.VITE_OPENROUTER_API_KEY = 'test-openrouter-key';

      const result = await getLandmarkSuggestion('London', 'UK');

      expect(result).toBeNull();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should successfully get landmark suggestion with valid API key', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Eiffel Tower'
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';
      import.meta.env.VITE_OPENROUTER_TEXT_MODEL = 'test-model';

      const result = await getLandmarkSuggestion('Paris', 'France');

      expect(result).toBe('Eiffel Tower');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          model: 'test-model',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Paris, France')
            })
          ]),
          max_tokens: 20,
          temperature: 0.3,
          top_p: 0.9,
          stream: false
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-api-key',
            'Content-Type': 'application/json'
          }),
          timeout: 15000
        })
      );
    });

    it('should handle empty response gracefully', async () => {
      const mockResponse = {
        data: {
          choices: []
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Unknown City', 'Unknown Country');

      expect(result).toBeNull();
    });

    it('should handle malformed response gracefully', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: null
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Test City', 'Test Country');

      expect(result).toBeNull();
    });

    it('should trim whitespace from landmark suggestion', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: '  Big Ben  '
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('London', 'UK');

      expect(result).toBe('Big Ben');
    });
  });

  describe('Retry Mechanism for 503 Errors', () => {
    it('should retry on 503 error and succeed on second attempt', async () => {
      const error503 = {
        response: { status: 503 },
        isAxiosError: true,
      };

      const successResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Statue of Liberty'
              }
            }
          ]
        }
      };

      mockedAxios.post
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce(successResponse);

      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const promise = getLandmarkSuggestion('New York', 'USA');

      // Fast-forward through the retry delay
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toBe('Statue of Liberty');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times with exponential backoff', async () => {
      const error503 = {
        response: { status: 503 },
        isAxiosError: true,
      };

      const successResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Tokyo Tower'
              }
            }
          ]
        }
      };

      mockedAxios.post
        .mockRejectedValueOnce(error503) // First attempt fails
        .mockRejectedValueOnce(error503) // Second attempt fails
        .mockResolvedValueOnce(successResponse); // Third attempt succeeds

      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const promise = getLandmarkSuggestion('Tokyo', 'Japan');

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(1000); // First retry delay (1s)
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay (2s)

      const result = await promise;

      expect(result).toBe('Tokyo Tower');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retries are exceeded', async () => {
      const error503 = {
        response: { status: 503 },
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValue(error503);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const promise = getLandmarkSuggestion('Berlin', 'Germany');

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry
      await vi.advanceTimersByTimeAsync(4000); // Third retry

      const result = await promise;

      expect(result).toBeNull();
      expect(mockedAxios.post).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry on non-503 errors', async () => {
      const error401 = {
        response: { status: 401 },
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValueOnce(error401);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Madrid', 'Spain');

      expect(result).toBeNull();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on network errors', async () => {
      const networkError = new Error('Network Error');

      mockedAxios.post.mockRejectedValueOnce(networkError);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Rome', 'Italy');

      expect(result).toBeNull();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No retries
    });

    it('should use correct exponential backoff delays', async () => {
      const error503 = {
        response: { status: 503 },
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValue(error503);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const startTime = Date.now();
      const promise = getLandmarkSuggestion('Barcelona', 'Spain');

      // Track when each retry happens
      const retryTimes: number[] = [];

      // First retry (1000ms delay)
      await vi.advanceTimersByTimeAsync(1000);
      retryTimes.push(Date.now() - startTime);

      // Second retry (2000ms delay)
      await vi.advanceTimersByTimeAsync(2000);
      retryTimes.push(Date.now() - startTime);

      // Third retry (4000ms delay)
      await vi.advanceTimersByTimeAsync(4000);
      retryTimes.push(Date.now() - startTime);

      await promise;

      // Verify exponential backoff pattern
      expect(retryTimes[0]).toBeGreaterThanOrEqual(1000);
      expect(retryTimes[1]).toBeGreaterThanOrEqual(3000); // 1000 + 2000
      expect(retryTimes[2]).toBeGreaterThanOrEqual(7000); // 1000 + 2000 + 4000
    });

    it('should handle timeout errors correctly', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 15000ms exceeded',
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValueOnce(timeoutError);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Amsterdam', 'Netherlands');

      expect(result).toBeNull();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No retries for timeout
    });

    it('should handle mixed error types during retries', async () => {
      const error503 = {
        response: { status: 503 },
        isAxiosError: true,
      };

      const error500 = {
        response: { status: 500 },
        isAxiosError: true,
      };

      mockedAxios.post
        .mockRejectedValueOnce(error503) // First attempt: 503 (will retry)
        .mockRejectedValueOnce(error500); // Second attempt: 500 (will not retry further)

      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const promise = getLandmarkSuggestion('Vienna', 'Austria');

      // Fast-forward through first retry delay
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toBeNull();
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle axios error without response object', async () => {
      const networkError = new Error('Network failure');

      mockedAxios.post.mockRejectedValueOnce(networkError);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Prague', 'Czech Republic');

      expect(result).toBeNull();
    });

    it('should handle very long city and country names', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Historic architecture'
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const longCityName = 'A'.repeat(100);
      const longCountryName = 'B'.repeat(100);

      const result = await getLandmarkSuggestion(longCityName, longCountryName);

      expect(result).toBe('Historic architecture');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining(longCityName)
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should handle special characters in city and country names', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Château architecture'
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('São Paulo', 'Brasil');

      expect(result).toBe('Château architecture');
    });

    it('should handle empty string responses', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: ''
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Unknown', 'Unknown');

      expect(result).toBe('');
    });

    it('should handle whitespace-only responses', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: '   \n\t   '
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const result = await getLandmarkSuggestion('Test', 'Test');

      expect(result).toBe('');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Landmark'
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);
      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const promises = [
        getLandmarkSuggestion('City1', 'Country1'),
        getLandmarkSuggestion('City2', 'Country2'),
        getLandmarkSuggestion('City3', 'Country3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(['Landmark', 'Landmark', 'Landmark']);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent requests with mixed success/failure', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Success'
              }
            }
          ]
        }
      };

      const error503 = {
        response: { status: 503 },
        isAxiosError: true,
      };

      mockedAxios.post
        .mockResolvedValueOnce(mockResponse) // First request succeeds
        .mockRejectedValueOnce(error503) // Second request fails initially
        .mockResolvedValueOnce(mockResponse) // Second request succeeds on retry
        .mockRejectedValue(new Error('Network error')); // Third request fails

      import.meta.env.VITE_OPENROUTER_API_KEY = 'valid-api-key';

      const promises = [
        getLandmarkSuggestion('Success City', 'Success Country'),
        getLandmarkSuggestion('Retry City', 'Retry Country'),
        getLandmarkSuggestion('Fail City', 'Fail Country'),
      ];

      // Handle the retry delay for the second request
      const resultsPromise = Promise.all(promises);
      await vi.advanceTimersByTimeAsync(1000);
      const results = await resultsPromise;

      expect(results).toEqual(['Success', 'Success', null]);
    });
  });
});