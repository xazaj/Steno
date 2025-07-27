/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
        'mono': ['SF Mono', 'ui-monospace', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        // macOS System Colors
        'macos': {
          'blue': '#007AFF',
          'green': '#34C759',
          'orange': '#FF9500',
          'red': '#FF3B30',
          'purple': '#AF52DE',
          'gray': '#8E8E93',
        },
        // Primary colors
        'color': {
          'primary': '#007AFF',
          'success': '#30D158',
          'warning': '#FF9F0A',
          'error': '#FF453A',
          'info': '#64D2FF',
        },
        // Background colors
        'surface': {
          'primary': '#FFFFFF',
          'secondary': '#F8F9FA',
          'tertiary': '#F2F2F7',
          'quaternary': '#E5E5EA',
          'card': 'rgba(255, 255, 255, 0.85)',
          'hover': 'rgba(0, 122, 255, 0.06)',
          'pressed': 'rgba(0, 122, 255, 0.12)',
          'selected': 'rgba(0, 122, 255, 0.08)',
          'focus': 'rgba(0, 122, 255, 0.15)',
        },
        // Text colors
        'text': {
          'primary': 'rgba(0, 0, 0, 0.85)',
          'secondary': 'rgba(0, 0, 0, 0.60)',
          'tertiary': 'rgba(0, 0, 0, 0.40)',
          'quaternary': 'rgba(0, 0, 0, 0.25)',
        },
        // Border colors
        'border': {
          'primary': 'rgba(0, 0, 0, 0.10)',
          'secondary': 'rgba(0, 0, 0, 0.08)',
          'tertiary': 'rgba(0, 0, 0, 0.05)',
        }
      },
      backdropBlur: {
        'macos': '20px',
      },
      boxShadow: {
        'macos-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'macos-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'macos-lg': '0 8px 25px rgba(0, 0, 0, 0.12)',
        'macos-inset': '0 1px 0 rgba(255, 255, 255, 0.9) inset',
        'macos-button': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'elevation-2': '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
        'elevation-3': '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        'elevation-4': '0 8px 32px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'macos-sm': '6px',
        'macos-md': '8px',
        'macos-lg': '12px',
        'macos-xl': '16px',
      },
      transitionTimingFunction: {
        'macos-standard': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'macos-decelerate': 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
        'macos-accelerate': 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
        'macos-sharp': 'cubic-bezier(0.4, 0.0, 0.6, 1.0)',
      },
      animation: {
        'macos-fade-in': 'fadeIn 0.3s ease',
        'macos-slide-up': 'slideUp 0.3s ease',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'slide-in': 'slideIn 0.3s ease',
        'pulse-recording': 'pulseRecording 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseRecording: {
          '0%': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 0 rgba(255, 69, 58, 0.4)' },
          '50%': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 4px rgba(255, 69, 58, 0.2)' },
          '100%': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 0 rgba(255, 69, 58, 0)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  safelist: [
    'line-clamp-2',
    'line-clamp-3',
    'hover-lift',
    'hover-scale',
    'hover-glow',
    'animate-slide-up',
    'animate-slide-in',
    'animate-fade-in',
    'animate-pulse-recording',
    'loading-shimmer',
    'ease-macos-standard',
    'ease-macos-decelerate',
    'ease-macos-accelerate',
    'ease-macos-sharp',
    'macos-scrollbar',
    'macos-scrollbar-list',
    'macos-scrollbar-auto-hide',
    'scroll-smooth',
    'scrollable-flex-container',
    'scrollable-content'
  ],
}