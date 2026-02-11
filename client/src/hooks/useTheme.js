import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { toggleTheme, setTheme } from '../redux/Slices/themeSlice';

export const useTheme = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);

  useEffect(() => {
    // Apply theme on mount
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  const toggle = () => {
    dispatch(toggleTheme());
  };

  const setMode = (newMode) => {
    dispatch(setTheme(newMode));
  };

  return {
    theme: mode,
    isDark: mode === 'dark',
    toggleTheme: toggle,
    setTheme: setMode,
  };
};

export default useTheme;