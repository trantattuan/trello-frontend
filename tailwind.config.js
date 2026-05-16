/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0C66E4',
        'primary-hover': '#0055CC',
        'primary-active': '#09326C',
        navy: '#091E42',
        'navy-2': '#172B4D',
        'navy-3': '#44546F',
        'gray-ui': '#F1F2F4',
        'gray-border': '#DCDFE4',
        'gray-mid': '#A9ABAF',
        'gray-dark': '#505258',
        'blue-light': '#85B8FF',
        'blue-pale': '#E9F2FF',
        warning: '#F5CD47',
      },
      fontFamily: {
        sans: ['"Charlie Text"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Charlie Display"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        btn: '4.8px',
        card: '4px',
      },
      boxShadow: {
        card: 'rgba(9, 30, 66, 0.13) 0px 1px 1px 0px',
        'card-hover': 'rgba(9, 30, 66, 0.25) 0px 4px 8px 0px',
        btn: 'rgba(9, 30, 66, 0.15) 0px 8px 16px 0px',
        modal: 'rgba(9, 30, 66, 0.3) 0px 12px 24px 0px',
        dropdown: 'rgba(9, 30, 66, 0.25) 0px 4px 8px 0px',
      },
    },
  },
  plugins: [],
}
