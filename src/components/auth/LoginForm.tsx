import React from 'react';
import { useForm } from 'react-hook-form';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
}

interface FormValues {
  email: string;
  password: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
  const { 
    register, 
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormValues>();

  const onFormSubmit = (data: FormValues) => {
    // Trim whitespace from email to prevent common input errors
    const cleanEmail = data.email.trim().toLowerCase();
    onSubmit(cleanEmail, data.password);
  };

  const emailValue = watch('email');

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={`input ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
          placeholder="your@email.com"
          {...register('email', { 
            required: 'Email address is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address'
            }
          })}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
        {emailValue && !errors.email && (
          <p className="mt-1 text-xs text-gray-500">
            Make sure this email matches your registered account
          </p>
        )}
      </div>
      
      <div className="mb-6">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={`input ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Enter your password"
          {...register('password', { 
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters long'
            }
          })}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>Signing in...</span>
          </div>
        ) : (
          'Sign In'
        )}
      </button>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Forgot your password? Contact support for assistance.
        </p>
      </div>
    </form>
  );
};

export default LoginForm;