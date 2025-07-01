/**
 * Countries Service
 * Handles country, region, and city data using country-state-city package
 */

import { Country, State, City } from "country-state-city";
import { apiCall } from "./api";

// Types
export interface CountryData {
  isoCode: string;
  name: string;
  phonecode: string;
  flag: string;
  currency: string;
  latitude: string;
  longitude: string;
}

export interface StateData {
  isoCode: string;
  name: string;
  countryCode: string;
  latitude?: string;
  longitude?: string;
}

export interface CityData {
  name: string;
  countryCode: string;
  stateCode: string;
  latitude?: string;
  longitude?: string;
}

export interface DropdownOption {
  value: string;
  label: string;
}

class CountriesService {
  /**
   * Get all countries
   */
  getAllCountries(): CountryData[] {
    return Country.getAllCountries();
  }

  /**
   * Get country by ISO code
   */
  getCountryByCode(isoCode: string): CountryData | undefined {
    return Country.getCountryByCode(isoCode);
  }

  /**
   * Get states for a specific country
   */
  getStatesOfCountry(countryCode: string): StateData[] {
    return State.getStatesOfCountry(countryCode);
  }

  /**
   * Get cities for a specific state
   */
  getCitiesOfState(countryCode: string, stateCode: string): CityData[] {
    return City.getCitiesOfState(countryCode, stateCode);
  }

  /**
   * Get cities for a specific country
   */
  getCitiesOfCountry(countryCode: string): CityData[] {
    return City.getCitiesOfCountry(countryCode);
  }

  /**
   * Search countries by name
   */
  searchCountries(query: string): CountryData[] {
    const allCountries = this.getAllCountries();
    const searchTerm = query.toLowerCase();

    return allCountries.filter((country) =>
      country.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Search states by name within a country
   */
  searchStates(countryCode: string, query: string): StateData[] {
    const states = this.getStatesOfCountry(countryCode);
    const searchTerm = query.toLowerCase();

    return states.filter((state) =>
      state.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Search cities by name within a state
   */
  searchCities(
    countryCode: string,
    stateCode: string,
    query: string
  ): CityData[] {
    const cities = this.getCitiesOfState(countryCode, stateCode);
    const searchTerm = query.toLowerCase();

    return cities.filter((city) =>
      city.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get countries formatted for dropdown
   */
  getCountriesForDropdown(): DropdownOption[] {
    const countries = this.getAllCountries();
    return countries
      .map((country) => ({
        value: country.isoCode,
        label: country.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Get states formatted for dropdown
   */
  getStatesForDropdown(countryCode: string): DropdownOption[] {
    const states = this.getStatesOfCountry(countryCode);
    return states
      .map((state) => ({
        value: state.isoCode,
        label: state.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Get cities formatted for dropdown
   */
  getCitiesForDropdown(
    countryCode: string,
    stateCode?: string
  ): DropdownOption[] {
    const cities = stateCode
      ? this.getCitiesOfState(countryCode, stateCode)
      : this.getCitiesOfCountry(countryCode);

    return cities
      .map((city) => ({
        value: city.name,
        label: city.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Get common countries (frequently used)
   */
  getCommonCountries(): DropdownOption[] {
    const commonCountryCodes = [
      "SA",
      "AE",
      "EG",
      "US",
      "GB",
      "DE",
      "FR",
      "CA",
      "AU",
      "JP",
    ];
    const allCountries = this.getAllCountries();

    return commonCountryCodes
      .map((code) => allCountries.find((country) => country.isoCode === code))
      .filter((country) => country !== undefined)
      .map((country) => ({
        value: country!.isoCode,
        label: country!.name,
      }));
  }

  /**
   * Get country details with states and major cities
   */
  getCountryDetails(countryCode: string): {
    country: CountryData | undefined;
    states: StateData[];
    majorCities: CityData[];
  } {
    const country = this.getCountryByCode(countryCode);
    const states = this.getStatesOfCountry(countryCode);
    const majorCities = this.getCitiesOfCountry(countryCode).slice(0, 10); // Top 10 cities

    return {
      country,
      states,
      majorCities,
    };
  }

  /**
   * Validate country code
   */
  isValidCountryCode(countryCode: string): boolean {
    return this.getCountryByCode(countryCode) !== undefined;
  }

  /**
   * Validate state code for a country
   */
  isValidStateCode(countryCode: string, stateCode: string): boolean {
    const states = this.getStatesOfCountry(countryCode);
    return states.some((state) => state.isoCode === stateCode);
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Array<{
    code: string;
    name: string;
    symbol: string;
  }> {
    return [
      { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
      { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
      { code: "USD", name: "US Dollar", symbol: "$" },
      { code: "EUR", name: "Euro", symbol: "€" },
      { code: "GBP", name: "British Pound", symbol: "£" },
      { code: "JPY", name: "Japanese Yen", symbol: "¥" },
      { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
      { code: "EGP", name: "Egyptian Pound", symbol: "ج.م" },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
      { code: "AUD", name: "Australian Dollar", symbol: "A$" },
      { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
      { code: "KRW", name: "South Korean Won", symbol: "₩" },
      { code: "INR", name: "Indian Rupee", symbol: "₹" },
      { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    ];
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{
    code: string;
    name: string;
    direction: "ltr" | "rtl";
  }> {
    return [
      { code: "en", name: "English", direction: "ltr" },
      { code: "ar", name: "العربية", direction: "rtl" },
      { code: "fr", name: "Français", direction: "ltr" },
      { code: "de", name: "Deutsch", direction: "ltr" },
      { code: "es", name: "Español", direction: "ltr" },
      { code: "it", name: "Italiano", direction: "ltr" },
      { code: "pt", name: "Português", direction: "ltr" },
      { code: "ru", name: "Русский", direction: "ltr" },
      { code: "ja", name: "日本語", direction: "ltr" },
      { code: "ko", name: "한국어", direction: "ltr" },
      { code: "zh", name: "中文", direction: "ltr" },
      { code: "hi", name: "हिन्दी", direction: "ltr" },
      { code: "tr", name: "Türkçe", direction: "ltr" },
      { code: "nl", name: "Nederlands", direction: "ltr" },
    ];
  }

  /**
   * Get supported timezones
   */
  getSupportedTimezones(): Array<{
    code: string;
    name: string;
    offset: string;
  }> {
    return [
      {
        code: "UTC",
        name: "UTC (Coordinated Universal Time)",
        offset: "+00:00",
      },
      { code: "AST", name: "Arabia Standard Time", offset: "+03:00" },
      { code: "GST", name: "Gulf Standard Time", offset: "+04:00" },
      { code: "EST", name: "Eastern Standard Time", offset: "-05:00" },
      { code: "CST", name: "Central Standard Time", offset: "-06:00" },
      { code: "MST", name: "Mountain Standard Time", offset: "-07:00" },
      { code: "PST", name: "Pacific Standard Time", offset: "-08:00" },
      { code: "GMT", name: "Greenwich Mean Time", offset: "+00:00" },
      { code: "CET", name: "Central European Time", offset: "+01:00" },
      { code: "EET", name: "Eastern European Time", offset: "+02:00" },
      { code: "JST", name: "Japan Standard Time", offset: "+09:00" },
      {
        code: "AEST",
        name: "Australian Eastern Standard Time",
        offset: "+10:00",
      },
      { code: "IST", name: "India Standard Time", offset: "+05:30" },
      { code: "CST_CHINA", name: "China Standard Time", offset: "+08:00" },
    ];
  }
}

// Export singleton instance
export const countriesService = new CountriesService();
export default countriesService;
