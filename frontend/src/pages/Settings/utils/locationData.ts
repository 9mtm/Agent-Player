import type { Country, City } from "../types/userTypes";

export const countries: Country[] = [
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    cities: [
      { id: "riyadh", name: "Riyadh", countryCode: "SA" },
      { id: "jeddah", name: "Jeddah", countryCode: "SA" },
      { id: "mecca", name: "Mecca", countryCode: "SA" },
      { id: "medina", name: "Medina", countryCode: "SA" },
      { id: "dammam", name: "Dammam", countryCode: "SA" },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    cities: [
      { id: "dubai", name: "Dubai", countryCode: "AE" },
      { id: "abu_dhabi", name: "Abu Dhabi", countryCode: "AE" },
      { id: "sharjah", name: "Sharjah", countryCode: "AE" },
    ],
  },
  {
    code: "EG",
    name: "Egypt",
    flag: "🇪🇬",
    cities: [
      { id: "cairo", name: "Cairo", countryCode: "EG" },
      { id: "alexandria", name: "Alexandria", countryCode: "EG" },
      { id: "giza", name: "Giza", countryCode: "EG" },
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    cities: [
      {
        id: "new_york",
        name: "New York",
        countryCode: "US",
        state: "New York",
      },
      {
        id: "los_angeles",
        name: "Los Angeles",
        countryCode: "US",
        state: "California",
      },
      { id: "chicago", name: "Chicago", countryCode: "US", state: "Illinois" },
      { id: "houston", name: "Houston", countryCode: "US", state: "Texas" },
      {
        id: "san_francisco",
        name: "San Francisco",
        countryCode: "US",
        state: "California",
      },
      { id: "miami", name: "Miami", countryCode: "US", state: "Florida" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    cities: [
      { id: "london", name: "London", countryCode: "GB", state: "England" },
      {
        id: "manchester",
        name: "Manchester",
        countryCode: "GB",
        state: "England",
      },
      {
        id: "birmingham",
        name: "Birmingham",
        countryCode: "GB",
        state: "England",
      },
      {
        id: "edinburgh",
        name: "Edinburgh",
        countryCode: "GB",
        state: "Scotland",
      },
      { id: "cardiff", name: "Cardiff", countryCode: "GB", state: "Wales" },
    ],
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    cities: [
      { id: "paris", name: "Paris", countryCode: "FR", state: "Île-de-France" },
      {
        id: "marseille",
        name: "Marseille",
        countryCode: "FR",
        state: "Provence-Alpes-Côte d'Azur",
      },
      {
        id: "lyon",
        name: "Lyon",
        countryCode: "FR",
        state: "Auvergne-Rhône-Alpes",
      },
      {
        id: "nice",
        name: "Nice",
        countryCode: "FR",
        state: "Provence-Alpes-Côte d'Azur",
      },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    cities: [
      { id: "berlin", name: "Berlin", countryCode: "DE", state: "Berlin" },
      { id: "munich", name: "Munich", countryCode: "DE", state: "Bavaria" },
      { id: "hamburg", name: "Hamburg", countryCode: "DE", state: "Hamburg" },
      { id: "frankfurt", name: "Frankfurt", countryCode: "DE", state: "Hesse" },
    ],
  },
];

export const getCitiesByCountry = (countryCode: string): City[] => {
  const country = countries.find((c) => c.code === countryCode);
  return country ? country.cities : [];
};

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find((c) => c.code === code);
};

export const validateAddress = (address: Partial<any>): any => {
  const errors: Record<string, string> = {};

  if (!address.street || address.street.length < 5) {
    errors.street = "Street address must be at least 5 characters";
  }

  if (!address.city) {
    errors.city = "City is required";
  }

  if (!address.country) {
    errors.country = "Country is required";
  }

  if (!address.postalCode || address.postalCode.length < 3) {
    errors.postalCode = "Valid postal code is required";
  }

  const country = getCountryByCode(address.country);
  if (country && address.city) {
    const cityExists = country.cities.some(
      (city) => city.name.toLowerCase() === address.city.toLowerCase()
    );
    if (!cityExists) {
      errors.city = "Please select a valid city from the list";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const linkTypes = [
  { id: "website", name: "Website", icon: "🌐" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "github", name: "GitHub", icon: "🐙" },
  { id: "twitter", name: "Twitter", icon: "🐦" },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
    placeholder: "https://facebook.com/username",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📷",
    placeholder: "https://instagram.com/username",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "📺",
    placeholder: "https://youtube.com/c/channel",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    icon: "🎨",
    placeholder: "https://yourportfolio.com",
  },
  { id: "blog", name: "Blog", icon: "📝", placeholder: "https://yourblog.com" },
  {
    id: "other",
    name: "Other",
    icon: "🔗",
    placeholder: "https://example.com",
  },
];

export const fileCategories = [
  {
    id: "profile",
    name: "Profile Images",
    description: "Avatar, cover photos, and profile images",
    icon: "👤",
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 5, // MB
  },
  {
    id: "resume",
    name: "Resume/CV",
    description: "Your professional resume and CV documents",
    icon: "📄",
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSize: 10,
  },
  {
    id: "certificate",
    name: "Certificates",
    description: "Professional certificates and achievements",
    icon: "🏆",
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSize: 10,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Work samples and portfolio items",
    icon: "🎨",
    allowedTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/zip",
    ],
    maxSize: 50,
  },
  {
    id: "document",
    name: "Documents",
    description: "General documents and files",
    icon: "📋",
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    maxSize: 25,
  },
  {
    id: "other",
    name: "Other",
    description: "Other file types",
    icon: "📁",
    allowedTypes: ["*/*"],
    maxSize: 100,
  },
];

export const validateUrl = (
  url: string
): { isValid: boolean; error?: string } => {
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isValid: false, error: "URL must use HTTP or HTTPS protocol" };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Please enter a valid URL" };
  }
};
