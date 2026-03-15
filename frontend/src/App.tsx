import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BooksPage from './pages/BooksPage';
import BookDetailPage from './pages/BookDetailPage';
import NoteEditorPage from './pages/NoteEditorPage';
import SettingsPage from './pages/SettingsPage';
import InconsistenciesPage from './pages/InconsistenciesPage';
import SearchPage from './pages/SearchPage';
import ChapterTimelinePage from './pages/ChapterTimelinePage';
import AnalysisPage from './pages/AnalysisPage';
import GlobalSettingsPage from './pages/GlobalSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/books" replace />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="books/:bookId" element={<BookDetailPage />} />
          <Route path="books/:bookId/notes/:noteId" element={<NoteEditorPage />} />
          <Route path="books/:bookId/notes/new" element={<NoteEditorPage />} />
          <Route path="books/:bookId/settings" element={<SettingsPage />} />
          <Route path="books/:bookId/inconsistencies" element={<InconsistenciesPage />} />
          <Route path="books/:bookId/search" element={<SearchPage />} />
          <Route path="books/:bookId/timeline" element={<ChapterTimelinePage />} />
          <Route path="books/:bookId/analysis" element={<AnalysisPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<GlobalSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
