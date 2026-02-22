'use client';

import { useState } from 'react';
import { X, Search, Phone, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { config } from '@/lib/config';

interface PurchaseNumberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  region: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
  monthlyCost: number;
}

export function PurchaseNumberDialog({ isOpen, onClose, onSuccess }: PurchaseNumberDialogProps) {
  const [step, setStep] = useState<'search' | 'results' | 'purchasing'>('search');
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search params
  const [country, setCountry] = useState('US');
  const [areaCode, setAreaCode] = useState('');

  // Results
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null);
  const [friendlyName, setFriendlyName] = useState('');

  const handleSearch = async () => {
    setSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({ country });
      if (areaCode) params.append('areaCode', areaCode);

      const response = await fetch(`${config.backendUrl}/api/telephony/numbers/search?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search for phone numbers');
      }

      const data = await response.json();
      setAvailableNumbers(data.numbers || []);
      setStep('results');
    } catch (err: any) {
      setError(err.message || 'Failed to search for phone numbers');
    } finally {
      setSearching(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedNumber) return;

    setPurchasing(true);
    setError(null);

    try {
      const response = await fetch('${config.backendUrl}/api/telephony/numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber.phoneNumber,
          friendlyName: friendlyName || selectedNumber.phoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to purchase phone number');
      }

      setStep('purchasing');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to purchase phone number');
    } finally {
      setPurchasing(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setCountry('US');
    setAreaCode('');
    setAvailableNumbers([]);
    setSelectedNumber(null);
    setFriendlyName('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Phone Number</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {step === 'search' && 'Search for available phone numbers'}
              {step === 'results' && 'Select a number to purchase'}
              {step === 'purchasing' && 'Purchasing number...'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'search' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Phone numbers are purchased from <strong>Twilio</strong>. You need valid Twilio credentials configured in Settings.
                  Numbers typically cost <strong>$1-2/month</strong>.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <optgroup label="Popular">
                    <option value="US">🇺🇸 United States</option>
                    <option value="CA">🇨🇦 Canada</option>
                    <option value="GB">🇬🇧 United Kingdom</option>
                    <option value="SA">🇸🇦 Saudi Arabia</option>
                    <option value="AE">🇦🇪 United Arab Emirates</option>
                  </optgroup>
                  <optgroup label="Middle East & North Africa">
                    <option value="BH">🇧🇭 Bahrain</option>
                    <option value="EG">🇪🇬 Egypt</option>
                    <option value="IL">🇮🇱 Israel</option>
                    <option value="JO">🇯🇴 Jordan</option>
                    <option value="KW">🇰🇼 Kuwait</option>
                    <option value="LB">🇱🇧 Lebanon</option>
                    <option value="OM">🇴🇲 Oman</option>
                    <option value="QA">🇶🇦 Qatar</option>
                    <option value="TN">🇹🇳 Tunisia</option>
                    <option value="TR">🇹🇷 Turkey</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="AT">🇦🇹 Austria</option>
                    <option value="BE">🇧🇪 Belgium</option>
                    <option value="BG">🇧🇬 Bulgaria</option>
                    <option value="HR">🇭🇷 Croatia</option>
                    <option value="CY">🇨🇾 Cyprus</option>
                    <option value="CZ">🇨🇿 Czech Republic</option>
                    <option value="DK">🇩🇰 Denmark</option>
                    <option value="EE">🇪🇪 Estonia</option>
                    <option value="FI">🇫🇮 Finland</option>
                    <option value="FR">🇫🇷 France</option>
                    <option value="DE">🇩🇪 Germany</option>
                    <option value="GR">🇬🇷 Greece</option>
                    <option value="HU">🇭🇺 Hungary</option>
                    <option value="IE">🇮🇪 Ireland</option>
                    <option value="IT">🇮🇹 Italy</option>
                    <option value="LV">🇱🇻 Latvia</option>
                    <option value="LT">🇱🇹 Lithuania</option>
                    <option value="LU">🇱🇺 Luxembourg</option>
                    <option value="MT">🇲🇹 Malta</option>
                    <option value="NL">🇳🇱 Netherlands</option>
                    <option value="NO">🇳🇴 Norway</option>
                    <option value="PL">🇵🇱 Poland</option>
                    <option value="PT">🇵🇹 Portugal</option>
                    <option value="RO">🇷🇴 Romania</option>
                    <option value="SK">🇸🇰 Slovakia</option>
                    <option value="SI">🇸🇮 Slovenia</option>
                    <option value="ES">🇪🇸 Spain</option>
                    <option value="SE">🇸🇪 Sweden</option>
                    <option value="CH">🇨🇭 Switzerland</option>
                  </optgroup>
                  <optgroup label="Asia Pacific">
                    <option value="AU">🇦🇺 Australia</option>
                    <option value="CN">🇨🇳 China</option>
                    <option value="HK">🇭🇰 Hong Kong</option>
                    <option value="IN">🇮🇳 India</option>
                    <option value="ID">🇮🇩 Indonesia</option>
                    <option value="JP">🇯🇵 Japan</option>
                    <option value="MY">🇲🇾 Malaysia</option>
                    <option value="NZ">🇳🇿 New Zealand</option>
                    <option value="PH">🇵🇭 Philippines</option>
                    <option value="SG">🇸🇬 Singapore</option>
                    <option value="KR">🇰🇷 South Korea</option>
                    <option value="TW">🇹🇼 Taiwan</option>
                    <option value="TH">🇹🇭 Thailand</option>
                    <option value="VN">🇻🇳 Vietnam</option>
                  </optgroup>
                  <optgroup label="Americas">
                    <option value="AR">🇦🇷 Argentina</option>
                    <option value="BR">🇧🇷 Brazil</option>
                    <option value="CL">🇨🇱 Chile</option>
                    <option value="CO">🇨🇴 Colombia</option>
                    <option value="CR">🇨🇷 Costa Rica</option>
                    <option value="DO">🇩🇴 Dominican Republic</option>
                    <option value="SV">🇸🇻 El Salvador</option>
                    <option value="MX">🇲🇽 Mexico</option>
                    <option value="PA">🇵🇦 Panama</option>
                    <option value="PE">🇵🇪 Peru</option>
                    <option value="PR">🇵🇷 Puerto Rico</option>
                    <option value="UY">🇺🇾 Uruguay</option>
                    <option value="VE">🇻🇪 Venezuela</option>
                  </optgroup>
                  <optgroup label="Africa">
                    <option value="KE">🇰🇪 Kenya</option>
                    <option value="NG">🇳🇬 Nigeria</option>
                    <option value="ZA">🇿🇦 South Africa</option>
                    <option value="TZ">🇹🇿 Tanzania</option>
                    <option value="UG">🇺🇬 Uganda</option>
                  </optgroup>
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {country === 'US' && '🇺🇸 Most popular - Local & Toll-free numbers available'}
                  {country === 'SA' && '🇸🇦 Saudi Arabia - Local numbers available'}
                  {country === 'AE' && '🇦🇪 UAE - Dubai & Abu Dhabi numbers'}
                  {country === 'GB' && '🇬🇧 UK - London, Manchester, Birmingham numbers'}
                  {!['US', 'SA', 'AE', 'GB'].includes(country) && 'Availability varies by country'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Area Code (Optional)
                </label>
                <input
                  type="text"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="e.g., 415 for San Francisco"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Leave blank to search all available numbers in the selected country
                </p>
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Found <strong>{availableNumbers.length}</strong> available numbers
                </p>
                <button
                  onClick={() => setStep('search')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Search again
                </button>
              </div>

              {availableNumbers.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No numbers found. Try a different area code.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableNumbers.map((number) => (
                    <button
                      key={number.phoneNumber}
                      onClick={() => setSelectedNumber(number)}
                      className={`w-full p-4 border rounded-lg transition-all text-left ${
                        selectedNumber?.phoneNumber === number.phoneNumber
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono font-semibold text-gray-900 dark:text-white">
                            {number.phoneNumber}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {number.region}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${number.monthlyCost.toFixed(2)}/month
                          </div>
                          <div className="flex gap-2 mt-1">
                            {number.capabilities.voice && (
                              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                Voice
                              </span>
                            )}
                            {number.capabilities.SMS && (
                              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                SMS
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedNumber && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Friendly Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={friendlyName}
                    onChange={(e) => setFriendlyName(e.target.value)}
                    placeholder="e.g., Main Support Line"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}

          {step === 'purchasing' && (
            <div className="text-center py-12">
              <Loader className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Purchasing {selectedNumber?.phoneNumber}...
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This may take a few moments
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={step === 'purchasing'}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {step === 'search' && (
            <button
              onClick={handleSearch}
              disabled={searching || !country}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {searching ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Numbers
                </>
              )}
            </button>
          )}

          {step === 'results' && (
            <button
              onClick={handlePurchase}
              disabled={!selectedNumber || purchasing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {purchasing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Purchasing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Purchase Number
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
