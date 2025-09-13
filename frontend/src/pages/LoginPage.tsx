import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, BookOpen, GraduationCap, Users, Award, Shield } from 'lucide-react';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding and Features */}
          <div className="hidden lg:block space-y-8">
            <div className="text-center">
              <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <h1 className="mt-6 text-4xl font-bold text-gray-900">
                Essay Competition Management
              </h1>
              <p className="mt-4 text-xl text-gray-600">
                Streamline your essay competitions with ease
              </p>
              <div className="mt-8 text-sm text-gray-500">
                <p className="font-semibold">Powered by</p>
                <p className="text-lg font-bold text-blue-600 mt-1">PCWT-Education Department</p>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Participant Management</h3>
                    <p className="text-gray-600">Efficiently manage registrations and participant data</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Evaluation System</h3>
                    <p className="text-gray-600">Streamlined evaluation process with real-time scoring</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Secure & Reliable</h3>
                    <p className="text-gray-600">Role-based access control and data security</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center lg:hidden mb-8">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">
                Essay Competition Management
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Powered by <span className="font-semibold text-blue-600">PCWT-Education Department</span>
              </p>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
              <p className="mt-2 text-gray-600">Sign in to your account to continue</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <input
                    {...register('username', { required: 'Username is required' })}
                    type="text"
                    autoComplete="username"
                    className={`input pl-10 ${errors.username ? 'input-error' : ''}`}
                    placeholder="Enter your username or email"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                {errors.username && (
                  <p className="mt-2 text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Enter your password"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="spinner h-5 w-5 border-2"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign in
                  </>
                )}
              </button>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 text-center">
                  <span className="font-semibold">Default Admin Credentials:</span>
                </p>
                <div className="mt-2 text-center">
                  <span className="font-mono text-sm bg-white px-3 py-1 rounded border border-blue-300 text-blue-900">
                    username: admin | password: admin123
                  </span>
                </div>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                © 2024 PCWT-Education Department. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}