/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            DEFAULT: '#104D73', // Petrol
            dark: '#012E40',    // Darker Petrol
          },
          yellow: {
            DEFAULT: '#F2CB07', // Yellow
            pale: '#F2DF7E',    // Pale Yellow
          },
          gray: {
            light: '#F2F2F2',   // Light Gray/White
          }
        }
      }
    },
  },
  plugins: [],
}