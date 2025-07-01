import React, { useState, useEffect } from 'react';

interface UserProfile {
  user_type?: 'individual' | 'company' | 'freelancer' | 'organization';
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  current_position?: string;
  experience_years?: number;
  company_name?: string;
  legal_name?: string;
  company_registration_number?: string;
  tax_id?: string;
  founded_year?: number;
  industry?: string;
  company_size?: string;
  website_url?: string;
  contact_person_name?: string;
  contact_person_title?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface DynamicProfileFormProps {
  userType?: 'individual' | 'company' | 'freelancer' | 'organization';
}

const DynamicProfileForm: React.FC<DynamicProfileFormProps> = ({ userType = 'individual' }) => {
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    user_type: userType,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeUserType, setActiveUserType] = useState(userType);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Load mock data based on user type
      const mockProfile: Partial<UserProfile> = {
        user_type: activeUserType,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        bio: 'A brief description about yourself or your company.',
        current_position: 'Senior Developer',
        contact_person_name: 'Professional Administrator',
      };

      if (activeUserType === 'company') {
        mockProfile.company_name = 'DPRO Technology';
        mockProfile.legal_name = 'DPRO Technology Ltd.';
        mockProfile.industry = 'technology';
        mockProfile.company_size = 'medium';
        mockProfile.website_url = 'https://dpro.at';
        mockProfile.founded_year = 2020;
        mockProfile.company_registration_number = '1010123456';
        mockProfile.tax_id = '301234567890003';
        mockProfile.contact_person_title = 'CEO';
        mockProfile.contact_person_email = 'ceo@dpro.at';
        mockProfile.contact_person_phone = '+966 50 123 4567';
      } else {
        mockProfile.middle_name = 'Middle';
        mockProfile.gender = 'male';
        mockProfile.date_of_birth = '1990-01-01';
        mockProfile.nationality = 'US';
        mockProfile.experience_years = 5;
      }

      setProfileData(mockProfile);
      
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setProfileData((prev: Partial<UserProfile>) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUserTypeChange = (newType: string) => {
    const userType = newType as 'individual' | 'company' | 'freelancer' | 'organization';
    setActiveUserType(userType);
    setProfileData((prev: Partial<UserProfile>) => ({
      ...prev,
      user_type: userType,
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Profile saved:', profileData);
      
      // Show success notification
      alert('Profile updated successfully!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserTypeSelector = () => (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      color: 'white'
    }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        marginBottom: '16px',
        color: 'white'
      }}>
        👤 Account Type Selection
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { key: 'individual', label: 'Individual', desc: 'Personal account for individual users', icon: '👤' },
          { key: 'company', label: 'Company', desc: 'Business account for companies', icon: '🏢' },
          { key: 'freelancer', label: 'Freelancer', desc: 'Professional freelancer account', icon: '💼' },
          { key: 'organization', label: 'Organization', desc: 'Non-profit or organization account', icon: '🏛️' }
        ].map(type => (
          <div
            key={type.key}
            onClick={() => handleUserTypeChange(type.key)}
            style={{
              background: activeUserType === type.key ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              border: activeUserType === type.key ? '2px solid white' : '2px solid transparent',
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{type.icon}</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{type.label}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>{type.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIndividualFields = () => (
    <>
      {/* Personal Information */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👤 Personal Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              First Name *
            </label>
            <input
              type="text"
              value={profileData.first_name || ''}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Professional"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Middle Name
            </label>
            <input
              type="text"
              value={profileData.middle_name || ''}
              onChange={(e) => handleInputChange('middle_name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Middle"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Last Name *
            </label>
            <input
              type="text"
              value={profileData.last_name || ''}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Smith"
            />
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Gender
            </label>
            <select
              value={profileData.gender || ''}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={profileData.date_of_birth || ''}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Nationality
            </label>
            <select
              value={profileData.nationality || ''}
              onChange={(e) => handleInputChange('nationality', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="">Select Nationality</option>
              <option value="SA">🇸🇦 Saudi</option>
              <option value="AE">🇦🇪 Emirati</option>
              <option value="EG">🇪🇬 Egyptian</option>
              <option value="JO">🇯🇴 Jordanian</option>
              <option value="LB">🇱🇧 Lebanese</option>
            </select>
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💼 Professional Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Current Position
            </label>
            <input
              type="text"
              value={profileData.current_position || ''}
              onChange={(e) => handleInputChange('current_position', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Professional"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Years of Experience
            </label>
            <select
              value={profileData.experience_years || ''}
              onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="">Select Experience Years</option>
              <option value="0">Less than 1 year</option>
              <option value="1">1-2 years</option>
              <option value="3">3-5 years</option>
              <option value="6">6-10 years</option>
              <option value="11">More than 10 years</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );

  const renderCompanyFields = () => (
    <>
      {/* Company Information */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🏢 Company Information
        </h3>

        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Company Name *
              </label>
              <input
                type="text"
                value={profileData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="DPRO Technology"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Legal Name
              </label>
              <input
                type="text"
                value={profileData.legal_name || ''}
                onChange={(e) => handleInputChange('legal_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="DPRO Technology Limited"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Registration Number
              </label>
              <input
                type="text"
                value={profileData.company_registration_number || ''}
                onChange={(e) => handleInputChange('company_registration_number', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="1010123456"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Tax ID
              </label>
              <input
                type="text"
                value={profileData.tax_id || ''}
                onChange={(e) => handleInputChange('tax_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="301234567890003"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Founded Year
              </label>
              <input
                type="number"
                value={profileData.founded_year || ''}
                onChange={(e) => handleInputChange('founded_year', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="2020"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Industry
              </label>
              <select
                value={profileData.industry || ''}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="">Select Industry</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
                <option value="construction">Construction</option>
                <option value="consulting">Consulting</option>
                <option value="government">Government</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Company Size
              </label>
              <select
                value={profileData.company_size || ''}
                onChange={(e) => handleInputChange('company_size', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="">Select Company Size</option>
                <option value="startup">Startup (1-10 employees)</option>
                <option value="small">Small (11-50 employees)</option>
                <option value="medium">Medium (51-200 employees)</option>
                <option value="large">Large (201-1000 employees)</option>
                <option value="enterprise">Enterprise (+1000 employees)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Website
              </label>
              <input
                type="url"
                value={profileData.website_url || ''}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="https://dpro.at"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Person */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👤 Contact Person
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Contact Person Name
            </label>
            <input
              type="text"
              value={profileData.contact_person_name || ''}
              onChange={(e) => handleInputChange('contact_person_name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Professional Administrator"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Position
            </label>
            <input
              type="text"
              value={profileData.contact_person_title || ''}
              onChange={(e) => handleInputChange('contact_person_title', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="Chief Executive Officer"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Email
            </label>
            <input
              type="email"
              value={profileData.contact_person_email || ''}
              onChange={(e) => handleInputChange('contact_person_email', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="ceo@dpro.at"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.contact_person_phone || ''}
              onChange={(e) => handleInputChange('contact_person_phone', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="+966 50 123 4567"
            />
          </div>
        </div>
      </div>
    </>
  );

  const renderSharedFields = () => (
    <>
      {/* Contact Information */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📧 Contact Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Email *
            </label>
            <input
              type="email"
              value={profileData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="+966 50 123 4567"
            />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            {activeUserType === 'individual' ? 'Personal Bio' : 'Company Description'}
          </label>
          <textarea
            value={profileData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '100px',
              resize: 'vertical'
            }}
            placeholder={activeUserType === 'individual' 
              ? 'Tell us about yourself, your interests, and professional background...'
              : 'Describe your company, mission, and services...'
            }
          />
        </div>
      </div>

      {/* Address Information */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📍 Address Information
        </h3>

        <div style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Street Address
            </label>
            <input
              type="text"
              value={profileData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              placeholder="123 Main Street"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                City
              </label>
              <input
                type="text"
                value={profileData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="Business District"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                State/Province
              </label>
              <input
                type="text"
                value={profileData.state || ''}
                onChange={(e) => handleInputChange('state', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="State/Province"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Postal Code
              </label>
              <input
                type="text"
                value={profileData.postal_code || ''}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                placeholder="12345"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Country
            </label>
            <select
              value={profileData.country || ''}
              onChange={(e) => handleInputChange('country', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="">Select Country</option>
              <option value="SA">🇸🇦 Saudi Arabia</option>
              <option value="AE">🇦🇪 United Arab Emirates</option>
              <option value="US">🇺🇸 United States</option>
              <option value="UK">🇬🇧 United Kingdom</option>
              <option value="CA">🇨🇦 Canada</option>
              <option value="AU">🇦🇺 Australia</option>
              <option value="DE">🇩🇪 Germany</option>
              <option value="FR">🇫🇷 France</option>
              <option value="JP">🇯🇵 Japan</option>
              <option value="KR">🇰🇷 South Korea</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        fontSize: '16px',
        color: '#667eea'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      {renderUserTypeSelector()}
      
      {activeUserType === 'individual' && renderIndividualFields()}
      {activeUserType === 'company' && renderCompanyFields()}
      {(activeUserType === 'freelancer' || activeUserType === 'organization') && renderIndividualFields()}
      
      {renderSharedFields()}

      {/* Save Button */}
      <div style={{
        position: 'sticky',
        bottom: '20px',
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <button
          onClick={handleSave}
          disabled={isLoading}
          style={{
            background: isLoading 
              ? '#95a5a6' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 48px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            minWidth: '200px'
          }}
        >
          {isLoading ? 'Saving...' : 'Save Profile'}
        </button>
        
        <p style={{
          marginTop: '12px',
          fontSize: '14px',
          color: '#7f8c8d',
          margin: '12px 0 0 0'
        }}>
          Your information is stored securely and will only be used for account management purposes.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default DynamicProfileForm; 