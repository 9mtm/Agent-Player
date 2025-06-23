import React from 'react';
import type { User } from '../../../services';
import type { Profile } from '../types';

interface ProfileTabProps {
  user: User | null;
  profile: Profile;
  showDeleteInfo: boolean;
  handleDeleteRequest: () => void;
  handleShareErrorsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  profile,
  showDeleteInfo,
  handleDeleteRequest,
  handleShareErrorsChange,
}) => {
  return (
    <div style={{ padding: '24px 0', maxWidth: 480 }}>
      <h3>Profile Information</h3>
      
      {/* User Info */}
      <div style={{ marginBottom: 12 }}>
        <strong>Email:</strong> {user?.email || 'Loading...'}
      </div>
      <div style={{ marginBottom: 12 }}>
        <strong>License Type:</strong> {profile.licenseType === 'free' ? 'Lifetime Free' : 'Annual Paid'}
      </div>
      <div style={{ marginBottom: 12 }}>
        <strong>License Status:</strong> 
        <span style={{ color: profile.licenseStatus === 'active' ? 'green' : 'red' }}>
          {profile.licenseStatus === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      <hr />
      
      {/* Data Shared */}
      <div style={{ margin: '16px 0 8px 0' }}>
        <strong>Data Shared with Company:</strong>
      </div>
      <ul style={{ margin: '8px 0 0 18px' }}>
        <li>Email address</li>
        <li>License type</li>
        <li>License status</li>
        <li>
          <span style={{ color: '#888' }}>
            No other personal data is collected or shared.
          </span>
        </li>
      </ul>
      
      {/* Error Reporting */}
      <div style={{ margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
        <input
          type="checkbox"
          id="shareErrors"
          checked={profile.shareErrors}
          onChange={handleShareErrorsChange}
          style={{ marginRight: 8 }}
        />
        <label htmlFor="shareErrors" style={{ fontWeight: 500, cursor: 'pointer' }}>
          Share error and crash reports to help improve the service
        </label>
      </div>
      <div style={{ color: '#888', fontSize: 14, marginBottom: 8, marginLeft: 26 }}>
        When enabled, anonymous error and crash reports will be sent to help us improve reliability. 
        No personal or sensitive data is included.
      </div>
      
      <hr />
      
      {/* Account Actions */}
      <div style={{ margin: '18px 0 8px 0' }}>
        <strong>Account Actions:</strong>
      </div>
      <button
        onClick={handleDeleteRequest}
        style={{
          background: '#e53935',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '8px 16px',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        Request Account Deletion
      </button>
      
      {showDeleteInfo && (
        <div style={{ marginTop: 12, color: '#e53935', fontSize: 14 }}>
          Your account deletion request has been submitted. You will receive an email confirmation shortly.
        </div>
      )}
    </div>
  );
};

export default ProfileTab; 