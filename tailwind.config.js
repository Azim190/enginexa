/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50:  '#e8f4f7',
                    100: '#c8e4ec',
                    200: '#96c9d9',
                    300: '#5da8bf',
                    400: '#2d889e',
                    500: '#0e6b84',
                    600: '#0B3D4E', // Deep teal — primary
                    700: '#092f3d',
                    800: '#06222d',
                    900: '#03141a',
                    950: '#01080d',
                },
                gold: {
                    50:  '#fdf8ee',
                    100: '#f8ecd0',
                    200: '#f1d69a',
                    300: '#e8bb5e',
                    400: '#dea035',
                    500: '#C8963E', // Warm sand gold — accent
                    600: '#a87830',
                    700: '#865d24',
                    800: '#64451a',
                    900: '#3f2b0e',
                },
                surface: {
                    DEFAULT: '#F5F2EC', // Warm alabaster
                    dark: '#0B3D4E',
                }
            },
            fontFamily: {
                display: ['"Playfair Display"', 'Georgia', 'serif'],
                sans:    ['"Syne"', 'system-ui', 'sans-serif'],
                arabic:  ['"Cairo"', 'sans-serif'],
            },
            backgroundImage: {
                'mashrabiya': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.08'%3E%3Cpolygon points='30,2 57,16 57,44 30,58 3,44 3,16'/%3E%3Cpolygon points='30,10 50,20 50,40 30,50 10,40 10,20'/%3E%3Cline x1='30' y1='2' x2='30' y2='10'/%3E%3Cline x1='57' y1='16' x2='50' y2='20'/%3E%3Cline x1='57' y1='44' x2='50' y2='40'/%3E%3Cline x1='30' y1='58' x2='30' y2='50'/%3E%3Cline x1='3' y1='44' x2='10' y2='40'/%3E%3Cline x1='3' y1='16' x2='10' y2='20'/%3E%3C/g%3E%3C/svg%3E\")",
            },
            keyframes: {
                'slide-in-right': {
                    '0%':   { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)',    opacity: '1' },
                },
                'slide-out-right': {
                    '0%':   { transform: 'translateX(0)',    opacity: '1' },
                    '100%': { transform: 'translateX(100%)', opacity: '0' },
                },
                'slide-in-top': {
                    '0%':   { transform: 'translateY(-16px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)',      opacity: '1' },
                },
                'toast-in': {
                    '0%':   { transform: 'translateX(120%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)',     opacity: '1' },
                },
                'toast-out': {
                    '0%':   { transform: 'translateX(0)',     opacity: '1' },
                    '100%': { transform: 'translateX(120%)', opacity: '0' },
                },
                'fade-scale-in': {
                    '0%':   { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                'count-up': {
                    '0%':   { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'drawer-in': {
                    '0%':   { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                'shimmer': {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'slide-in-right':  'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)',
                'slide-out-right': 'slide-out-right 0.25s ease-in',
                'slide-in-top':    'slide-in-top 0.25s ease-out',
                'toast-in':        'toast-in 0.35s cubic-bezier(0.16,1,0.3,1)',
                'toast-out':       'toast-out 0.25s ease-in forwards',
                'fade-scale-in':   'fade-scale-in 0.2s ease-out',
                'count-up':        'count-up 0.4s ease-out',
                'drawer-in':       'drawer-in 0.35s cubic-bezier(0.16,1,0.3,1)',
                'shimmer':         'shimmer 2s linear infinite',
            },
            boxShadow: {
                'gold':   '0 0 0 3px rgba(200,150,62,0.25)',
                'teal':   '0 0 0 3px rgba(11,61,78,0.2)',
                'card':   '0 2px 16px rgba(11,61,78,0.08)',
                'card-lg':'0 8px 40px rgba(11,61,78,0.14)',
                'drawer': '-8px 0 40px rgba(0,0,0,0.18)',
            },
        },
    },
    plugins: [],
}
