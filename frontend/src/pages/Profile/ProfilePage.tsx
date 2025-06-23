import React from 'react';

export const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-semibold">👤</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600">Manage your personal information and account settings</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 text-2xl">👤</span>
                </div>
                <div>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                    Change Picture
                  </button>
                  <p className="text-sm text-gray-500 mt-2">PNG or JPG, max 5MB</p>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive notifications about account activity</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">Additional protection for your account</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                Save Changes
              </button>
              <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 