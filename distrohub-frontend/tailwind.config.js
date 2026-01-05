/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
  		},
  		spacing: {
  			'1': '8px',
  			'2': '16px',
  			'3': '24px',
  			'4': '32px',
  			'5': '40px',
  			'6': '48px',
  			'7': '56px',
  			'8': '64px',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		  		colors: {
  		  			background: 'hsl(var(--background))',
  		  			foreground: 'hsl(var(--foreground))',
  		  			card: {
  		  				DEFAULT: 'hsl(var(--card))',
  		  				foreground: 'hsl(var(--card-foreground))'
  		  			},
  		  			popover: {
  		  				DEFAULT: 'hsl(var(--popover))',
  		  				foreground: 'hsl(var(--popover-foreground))'
  		  			},
  		  			muted: {
  		  				DEFAULT: 'hsl(var(--muted))',
  		  				foreground: 'hsl(var(--muted-foreground))'
  		  			},
  		  			accent: {
  		  				DEFAULT: 'hsl(var(--accent))',
  		  				foreground: 'hsl(var(--accent-foreground))'
  		  			},
  		  			destructive: {
  		  				DEFAULT: 'hsl(var(--destructive))',
  		  				foreground: 'hsl(var(--destructive-foreground))'
  		  			},
  		  			border: 'hsl(var(--border))',
  		  			input: 'hsl(var(--input))',
  		  			ring: 'hsl(var(--ring))',
  		  			primary: {
  				DEFAULT: '#4F46E5',
  				50: '#EEEEFF',
  				100: '#E0E0FF',
  				200: '#C7C4FE',
  				300: '#A5A1FC',
  				400: '#8B85F9',
  				500: '#4F46E5',
  				600: '#4338CA',
  				700: '#3730A3',
  				800: '#312E81',
  				900: '#1E1B4B',
  			},
  			slate: {
  				DEFAULT: '#0F172A',
  				50: '#F8FAFC',
  				100: '#F1F5F9',
  				200: '#E2E8F0',
  				300: '#CBD5E1',
  				400: '#94A3B8',
  				500: '#64748B',
  				600: '#475569',
  				700: '#334155',
  				800: '#1E293B',
  				900: '#0F172A',
  				950: '#020617',
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'shimmer': {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(100%)' }
  			},
  			'fade-in': {
  				'0%': { opacity: '0', transform: 'translateY(10px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'shimmer': 'shimmer 2s infinite',
  			'fade-in': 'fade-in 0.3s ease-out'
  		}
  	}
  },
  plugins: [import("tailwindcss-animate")],
}

