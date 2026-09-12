import { Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../store/AuthContext';

import SubtitleViewer from '../components/SubtitleViewer/SubtitleViewer';
import DictionaryPage from '../components/DictionaryPage/DictionaryPage';
import SubtitlesPage from '../components/SubtitlesPage/SubtitlesPage';
import LoginPage from '../components/LoginPage/LoginPage';
import HomePage from '../components/HomePage/HomePage';
import DashboardPage from '../components/DashboardPage/DashboardPage';
import VideoPage from '../components/VideoPage/VideoPage';
import NotFoundPage from '../components/NotFoundPage/NotFoundPage';
import DictionaryItemsPage from '../components/DictionaryItemsPage/DictionaryItemsPage';
import { urls } from '../constants/urls';
import SubscribePage from "../components/Subscribe/SubscribePage";
import TelegramBotPage from "../components/TelegramBotPage/TelegramBotPage";
import React from "react";
import SongSearchPlayer from "../components/SongsPage/SongSearchPlayer";
import LearningPage from "../components/LearningPage/LearningPage";
import TextPasteHighlighter from "../components/TextPasteHighlighter/TextPasteHighlighter";
import TiktokPage from "../components/TiktokPage/TiktokPage";
import AdminDashboard from '../components/AdminDashboard/AdminDashboard';
import ProtectedRoute from './ProtectedRoute';
import { UserRole } from '../constants/roles';
import PublicContentLanding from '../components/PublicContentLanding/PublicContentLanding';


const AppRoutes = () => {
    const { isLoggedIn } = useContext(AuthContext);

    return (
        <Routes>
            <Route path="/" element={isLoggedIn ? <DashboardPage /> : <HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/telegramBot" element={<TelegramBotPage />} />


            <Route path="/tt" element={<TiktokPage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
            <Route path="/subtitles" element={<SubtitlesPage />} />
            <Route path="/songs" element={<SongSearchPlayer />} />
            <Route path="/videos" element={<VideoPage />} />
            <Route path="/subscribe" element={<SubscribePage />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path={urls.login} element={<LoginPage />} />
            <Route path="/subtitles/:fileId" element={<SubtitleViewer />} />
            <Route path="/dictionary/resources/:resourceName" element={<DictionaryItemsPage />} />
            <Route path="/text-paste" element={<TextPasteHighlighter />} />
            <Route path="/learn/media/:slug" element={<PublicContentLanding />} />

            {}
            <Route element={<ProtectedRoute requiredRole={UserRole.SYSTEM_ADMIN} />}>
                <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Dedicated Interactive Demo Routes */}
            <Route path="/demo" element={<VideoPage hideGoogleDrive={true} />} />
            <Route path="/youtube-demo" element={<VideoPage hideGoogleDrive={true} />} />
            <Route path="/movies" element={<VideoPage hideGoogleDrive={true} />} />
            <Route path="/songs-demo" element={<SongSearchPlayer />} />
            <Route path="/texts-demo" element={<TextPasteHighlighter />} />
            <Route path="/subtitles-demo" element={<SubtitlesPage />} />
            <Route path="/dictionary-demo" element={<DictionaryPage />} />
            <Route path="/review-demo" element={<LearningPage />} />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;