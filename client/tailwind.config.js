/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Futuristic primary colors - deep space blues and purples
        primary: {
          50: '#f0f4ff',
          100: '#e0e8ff',
          200: '#c7d5ff',
          300: '#a3b8ff',
          400: '#7690ff',
          500: '#4965ff',
          600: '#2a47ff',
          700: '#1a36e8',
          800: '#182cc2',
          900: '#1a2b8a',
          950: '#0f1852',
        },
        // Accent colors - neon cyan
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Secondary accent - electric purple
        electric: {
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
        },
        // Background gradients
        space: {
          900: '#0a0a0f',
          800: '#0f0f1a',
          700: '#141424',
          600: '#1a1a2e',
          500: '#212134',
        },
        // Glassmorphism backgrounds
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.3)',
          blue: 'rgba(73, 101, 255, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px theme(colors.accent.400), 0 0 10px theme(colors.accent.400)' },
          '100%': { boxShadow: '0 0 20px theme(colors.accent.400), 0 0 40px theme(colors.accent.400)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(73, 101, 255, 0.4)',
        'glow-lg': '0 0 40px rgba(73, 101, 255, 0.6)',
        'glow-accent': '0 0 20px rgba(6, 182, 212, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(73, 101, 255, 0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-cosmic': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        'gradient-electric': 'linear-gradient(135deg, #06b6d4 0%, #4965ff 50%, #a855f7 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
        'mesh-gradient': `radial-gradient(at 40% 20%, hsla(242, 100%, 70%, 0.3) 0px, transparent 50%),
                         radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 0.3) 0px, transparent 50%),
                         radial-gradient(at 0% 50%, hsla(355, 100%, 93%, 0.3) 0px, transparent 50%),
                         radial-gradient(at 80% 50%, hsla(340, 100%, 76%, 0.3) 0px, transparent 50%),
                         radial-gradient(at 0% 100%, hsla(269, 100%, 77%, 0.3) 0px, transparent 50%)`,
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}; 