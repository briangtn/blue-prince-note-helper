import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('bp_theme') || 'blueprint')
  const [navStyle, setNavStyle] = useState(() => localStorage.getItem('bp_nav') || 'sidebar')

  useEffect(() => {
    document.documentElement.className =
      theme === 'manoir' ? 'theme-manoir' :
      theme === 'moderne' ? 'theme-moderne' : ''
    localStorage.setItem('bp_theme', theme)
  }, [theme])

  useEffect(() => { localStorage.setItem('bp_nav', navStyle) }, [navStyle])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, navStyle, setNavStyle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() { return useContext(ThemeContext) }
