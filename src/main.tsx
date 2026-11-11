import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './styles.css';
import { applySavedTheme } from './ui/theme';

applySavedTheme();

createRoot(document.getElementById('root')!).render(<App />);
